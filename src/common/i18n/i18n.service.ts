import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messages, MessageVars } from './messages';

@Injectable()
export class I18nService {
  constructor(private readonly config: ConfigService) {}

  t(key: string, languageCode: string | null | undefined, vars?: Omit<MessageVars, 'communityName' | 'standardPackage' | 'vipPackage'>): string {
    const lang = languageCode === 'en' ? 'en' : 'lt';
    const communityName = this.config.get<string>('communityName') ?? 'Club';
    const standardPackage = this.config.get<string>('standardPackageName') ?? 'Standard';
    const vipPackage = this.config.get<string>('vipPackageName') ?? 'Plus';
    const fn = messages[lang][key] ?? messages['lt'][key];
    return fn({ communityName, standardPackage, vipPackage, ...vars });
  }

  lang(languageCode: string | null | undefined): 'lt' | 'en' {
    return languageCode === 'en' ? 'en' : 'lt';
  }
}
