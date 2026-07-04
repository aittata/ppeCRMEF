// backend/src/features/seances/seances.controller.ts
import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SeancesService } from './seances.service';
import { CreateSeanceDto } from './dto/create-seance.dto';
import { UpdateSeanceDto } from './dto/update-seance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '../../entities/user.entity';

class FilterSeanceDto {
  @IsUUID('all')
  @IsOptional()
  enseignantId?: string;

  @IsUUID('all')
  @IsOptional()
  classeId?: string;

  @IsString()
  @IsOptional()
  matiere?: string;

  @Transform(({ obj }) => {
    const value = obj.actif;
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seances')
export class SeancesController {
  constructor(private readonly seancesService: SeancesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  create(@Body() createSeanceDto: CreateSeanceDto, @CurrentUser() user: User) {
    return this.seancesService.create(createSeanceDto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  findAll(@Query() filters: FilterSeanceDto, @CurrentUser() user: User) {
    return this.seancesService.findAll(filters, user);
  }

  @Get('enseignant/:enseignantId')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  findByEnseignant(
    @Param('enseignantId') enseignantId: string,
    @Query('actifOnly') actifOnly?: boolean
  ) {
    return this.seancesService.findByEnseignant(enseignantId, actifOnly);
  }

  @Get('classe/:classeId')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  findByClasse(
    @Param('classeId') classeId: string,
    @CurrentUser() user: User,
    @Query('actifOnly') actifOnly?: boolean
  ) {
    return this.seancesService.findByClasse(classeId, actifOnly, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT, Role.PARENT)
  findById(@Param('id') id: string) {
    return this.seancesService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  update(@Param('id') id: string, @Body() updateSeanceDto: UpdateSeanceDto, @CurrentUser() user: User) {
    return this.seancesService.update(id, updateSeanceDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.seancesService.remove(id, user);
  }
}
