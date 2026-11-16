import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard.js';
import { QuestionAssistantFactureDto, ReponseAssistantFactureDto } from './dtos/assistant-facture.dto.js';
import { AssistantGlobalService } from './assistant-global.service.js';

@ApiTags('Assistant global')
@Controller('assistant')
export class AssistantGlobalController {
  constructor(private readonly assistant: AssistantGlobalService) {}

  @Post('question')
  @UseGuards(KeycloakAuthGuard)
  @ApiCreatedResponse({ type: ReponseAssistantFactureDto })
  @ApiOperation({ summary: 'Poser une question sur l’ensemble des factures' })
  questionner(@Body() donnees: QuestionAssistantFactureDto): Promise<ReponseAssistantFactureDto> {
    return this.assistant.repondre(donnees.question);
  }
}
