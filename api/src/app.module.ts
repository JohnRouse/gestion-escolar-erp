import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicosModule } from './academicos/academicos.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { ComunicacionesModule } from './comunicaciones/comunicaciones.module';
import { PrismaModule } from './prisma/prisma.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AcademicosModule,
    FinanzasModule,
    ComunicacionesModule,
    CalificacionesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
