import { Controller, Post, Put, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Put('cambiar-password')
  @UseGuards(AuthGuard('jwt'))   // ← ESTO FALTABA
  async cambiarPassword(
    @Request() req,
    @Body() body: { password_actual: string; password_nueva: string },
  ) {
    return this.authService.cambiarPassword(
      req.user.userId,
      body.password_actual,
      body.password_nueva,
    );
  }
}