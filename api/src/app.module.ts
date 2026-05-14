import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicosModule } from './academicos/academicos.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { PrismaModule } from './prisma/prisma.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { CircularesModule } from './circulares/circulares.module';
import { AnaliticasModule } from './analiticas/analiticas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ActividadModule } from './actividad/actividad.module';
import { ApoderadosModule } from './apoderados/apoderados.module';

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
    ActividadModule,
    ApoderadosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
