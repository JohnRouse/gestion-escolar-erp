import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicosModule } from './academicos/academicos.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { PrismaModule } from './prisma/prisma.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { CircularesModule } from './circulares/circulares.module';
import { AnaliticasModule } from './analiticas/analiticas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AcademicosModule,
    FinanzasModule,
    CalificacionesModule,
    CircularesModule,
    AnaliticasModule,
    NotificacionesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
