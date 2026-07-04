// backend/src/features/classes/classes.controller.ts
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, Role } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async findAll(@Query('actif') actif?: string, @Query('niveau') niveau?: string) {
    let parsedActif: boolean | undefined = undefined;
    if (actif !== undefined) {
      if (actif === 'true' || actif === '1') parsedActif = true;
      else if (actif === 'false' || actif === '0') parsedActif = false;
    }
    const filters = {
      actif: parsedActif,
      niveau,
    };
    return this.classesService.findAll(filters);
  }

  @Get('enseignant/:enseignantId')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT)
  async findByEnseignant(@Param('enseignantId') enseignantId: string) {
    return this.classesService.findByEnseignant(enseignantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF, Role.ENSEIGNANT)
  async findById(@Param('id') id: string) {
    return this.classesService.findById(id);
  }

  @Get(':id/stats')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async getStats(@Param('id') id: string) {
    return this.classesService.getStats(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async create(@Body() dto: CreateClasseDto, @CurrentUser() currentUser: User) {
    return this.classesService.create(dto, currentUser);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CADRE_ADMINISTRATIF)
  async update(@Param('id') id: string, @Body() dto: UpdateClasseDto, @CurrentUser() currentUser: User) {
    return this.classesService.update(id, dto, currentUser);
  }
}
