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
import { CitasModule } from './citas/citas.module';
import { EventosModule } from './eventos/eventos.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AlbumesModule } from './albumes/albumes.module';
import { NfcModule } from './nfc/nfc.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActividadInterceptor } from './auth/actividad.interceptor';
import { PlantillasModule } from './plantillas/plantillas.module';

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
    CitasModule,
    EventosModule,
    ScheduleModule.forRoot(),
    AlbumesModule,
    NfcModule,
    PlantillasModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ActividadInterceptor },
  ],
})
export class AppModule {}
