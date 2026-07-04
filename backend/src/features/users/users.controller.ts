// backend/src/features/users/users.controller.ts
import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, User } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('role/:role')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async findByRole(@Param('role') role: Role) {
    return this.usersService.findByRole(role);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/audit')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async getAuditLogs(@Param('id') id: string) {
    return this.usersService.getAuditLogs(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: User) {
    return this.usersService.create(dto, currentUser);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() currentUser: User) {
    return this.usersService.update(id, dto, currentUser);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async deactivate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.deactivate(id, currentUser);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async reactivate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.reactivate(id, currentUser);
  }
}
