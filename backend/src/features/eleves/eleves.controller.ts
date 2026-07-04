// backend/src/features/eleves/eleves.controller.ts
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ElevesService } from './eleves.service';
import { CreateEleveDto } from './dto/create-eleve.dto';
import { UpdateEleveDto } from './dto/update-eleve.dto';
import { FilterEleveDto } from './dto/filter-eleve.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, User } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('eleves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ElevesController {
  constructor(private readonly elevesService: ElevesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  async findAll(@Query() filters: FilterEleveDto, @CurrentUser() currentUser: User) {
    const result = await this.elevesService.findAll(filters, currentUser);
    return {
      data: result.data,
      total: result.total,
      page: filters.page || 1,
      limit: filters.limit || 100,
      totalPages: Math.ceil(result.total / (filters.limit || 100))
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  async findById(@Param('id') id: string) {
    return this.elevesService.findById(id);
  }

  @Get(':id/stats')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  async getStats(@Param('id') id: string) {
    return this.elevesService.getStats(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async create(@Body() dto: CreateEleveDto, @CurrentUser() currentUser: User) {
    return this.elevesService.create(dto, currentUser);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async update(@Param('id') id: string, @Body() dto: UpdateEleveDto, @CurrentUser() currentUser: User) {
    return this.elevesService.update(id, dto, currentUser);
  }
}
