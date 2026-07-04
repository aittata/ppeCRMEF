// backend/src/features/absences/absences.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateEtatDto, BulkUpdateEtatDto } from './dto/update-etat.dto';
import { FilterAbsenceDto } from './dto/filter-absence.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, User as UserEntity } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExportService } from '../export/export.service';
import { Response } from 'express';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(
    private readonly absencesService: AbsencesService,
    private readonly exportService: ExportService
  ) {}

  @Get('stats')
  @Roles(Role.CADRE_ADMINISTRATIF, Role.ADMIN)
  async getDashboardStats(@Query() filters: FilterAbsenceDto) {
    return this.absencesService.getDashboardStats(filters);
  }

  @Get('export')
  async exportXls(@Query() filters: FilterAbsenceDto, @CurrentUser() user: UserEntity, @Res() res: Response) {
    const absences = await this.absencesService.getForExport(filters, user);
    const buffer = await this.exportService.generateAbsencesXls(absences);
    
    const today = new Date().toISOString().slice(0,10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="absences-${today}.xlsx"`,
    });
    
    res.send(buffer);
  }

  @Get()
  async findAll(@Query() filters: FilterAbsenceDto, @CurrentUser() user: UserEntity) {
    const result = await this.absencesService.findAll(filters, user);
    const limit = filters.limit || 50;
    return {
      data: result.data,
      total: result.total,
      page: filters.page || 1,
      limit: limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.absencesService.findById(id, user);
  }

  @Post()
  @Roles(Role.ENSEIGNANT, Role.CADRE_ADMINISTRATIF, Role.ADMIN)
  async create(@Body() createAbsenceDto: CreateAbsenceDto, @CurrentUser() user: UserEntity) {
    return this.absencesService.create(createAbsenceDto, user);
  }

  @Patch('bulk-etat')
  @Roles(Role.CADRE_ADMINISTRATIF, Role.ADMIN)
  async bulkUpdateEtat(@Body() bulkUpdateEtatDto: BulkUpdateEtatDto, @CurrentUser() user: UserEntity) {
    return this.absencesService.bulkUpdateEtat(bulkUpdateEtatDto, user);
  }

  @Patch(':id/etat')
  @Roles(Role.CADRE_ADMINISTRATIF, Role.ADMIN)
  async updateEtat(@Param('id') id: string, @Body() updateEtatDto: UpdateEtatDto, @CurrentUser() user: UserEntity) {
    return this.absencesService.updateEtat(id, updateEtatDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.absencesService.remove(id, user);
  }
}
