import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  normalizePrismaWriteArgs,
  WRITE_OPERATIONS,
} from '../common/data-normalizer';

function delegateKeyFromModel(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
  private readonly modelDelegateKeys = new Set(
    this.modelNames.map((modelName) => delegateKeyFromModel(modelName)),
  );

  constructor() {
    super();

    this.installGlobalWriteNormalizer();
  }

  private installGlobalWriteNormalizer() {
    for (const modelName of this.modelNames) {
      const delegateKey = delegateKeyFromModel(modelName);
      const originalDelegate = (this as any)[delegateKey];

      if (!originalDelegate) continue;

      const proxiedDelegate = this.createDelegateProxy(modelName, originalDelegate);

      Object.defineProperty(this, delegateKey, {
        configurable: true,
        enumerable: false,
        get: () => proxiedDelegate,
      });
    }

    const originalTransaction = (this as any).$transaction.bind(this);

    Object.defineProperty(this, '$transaction', {
      configurable: true,
      enumerable: false,
      value: (input: any, ...rest: any[]) => {
        if (typeof input === 'function') {
          return originalTransaction((tx: any) => input(this.createTransactionProxy(tx)), ...rest);
        }

        return originalTransaction(input, ...rest);
      },
    });
  }

  private createDelegateProxy(modelName: string, delegate: any) {
    return new Proxy(delegate, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop);

        if (typeof prop !== 'string' || typeof value !== 'function') {
          return value;
        }

        return (...args: any[]) => {
          if (WRITE_OPERATIONS.has(prop)) {
            const normalizedArgs = normalizePrismaWriteArgs(modelName, prop, args[0]);
            return value.apply(target, [normalizedArgs, ...args.slice(1)]);
          }

          return value.apply(target, args);
        };
      },
    });
  }

  private createTransactionProxy(tx: any) {
    return new Proxy(tx, {
      get: (target, prop) => {
        if (typeof prop !== 'string') {
          return Reflect.get(target, prop);
        }

        const value = Reflect.get(target, prop);

        if (prop === '$transaction' && typeof value === 'function') {
          return (input: any, ...rest: any[]) => {
            if (typeof input === 'function') {
              return value.call(target, (nestedTx: any) => input(this.createTransactionProxy(nestedTx)), ...rest);
            }

            return value.call(target, input, ...rest);
          };
        }

        if (this.modelDelegateKeys.has(prop) && value) {
          const modelName = this.modelNames.find((model) => delegateKeyFromModel(model) === prop) || prop;
          return this.createDelegateProxy(modelName, value);
        }

        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
