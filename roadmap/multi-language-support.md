# Multi-Language Support (i18n)

## Overview
Implement comprehensive internationalization and localization support, enabling Next CMS to power multilingual websites with content translation management, language-specific URLs, and automatic language detection.

## Goals
- Support unlimited languages per site
- Easy content translation workflow
- SEO-friendly multilingual URLs
- Automatic language detection
- RTL language support

## Key Features

### Language Management
- **Multiple Languages**: Add unlimited languages to any site
- **Default Language**: Set primary/fallback language
- **Language Activation**: Enable/disable languages per site
- **Language Configuration**: Name, code, direction, date format
- **Language Hierarchy**: Parent/fallback language relationships

### Content Translation
- **Translation Interface**: Side-by-side translation editor
- **Translation Status**: Track translated, untranslated, outdated
- **Auto-Translation**: Optional machine translation (Google, DeepL)
- **Translation Memory**: Reuse previous translations
- **Glossary**: Maintain consistent terminology

### URL Strategies
- **Subdomain**: `en.yoursite.com`, `fr.yoursite.com`
- **Directory**: `yoursite.com/en/`, `yoursite.com/fr/`
- **Parameter**: `yoursite.com?lang=en`
- **Domain**: `yoursite.com`, `yoursite.fr`

### Language Switching
- **Auto-Detection**: Browser language, geolocation, cookie
- **Manual Switcher**: Dropdown or flags in navbar
- **Persistence**: Remember user's language choice
- **Redirects**: Automatic redirect to user's language

### Localization Features
- **Date Formats**: Locale-specific date formatting
- **Number Formats**: Locale-specific number formatting
- **Currency**: Multi-currency support
- **Time Zones**: Display times in user's timezone
- **RTL Support**: Right-to-left language layouts

## Database Schema

### Languages Table
```sql
CREATE TABLE site_{id}_languages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  direction ENUM('ltr', 'rtl') DEFAULT 'ltr',
  locale VARCHAR(10),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  flag_emoji VARCHAR(10),
  order_num INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_code (code)
);

-- Default languages
INSERT INTO site_{id}_languages (code, name, native_name, direction, locale, is_default, flag_emoji) VALUES
('en', 'English', 'English', 'ltr', 'en-US', true, '🇬🇧'),
('es', 'Spanish', 'Español', 'ltr', 'es-ES', false, '🇪🇸'),
('fr', 'French', 'Français', 'ltr', 'fr-FR', false, '🇫🇷'),
('de', 'German', 'Deutsch', 'ltr', 'de-DE', false, '🇩🇪'),
('ar', 'Arabic', 'العربية', 'rtl', 'ar-SA', false, '🇸🇦');
```

### Post Translations Table
```sql
CREATE TABLE site_{id}_post_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  title VARCHAR(500),
  slug VARCHAR(500),
  content LONGTEXT,
  excerpt TEXT,
  seo_title VARCHAR(200),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  custom_fields JSON,
  translation_status ENUM('translated', 'pending', 'outdated', 'auto') DEFAULT 'pending',
  translated_by INT,
  translated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_{id}_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES site_{id}_languages(code) ON DELETE CASCADE,
  UNIQUE KEY unique_post_lang (post_id, language_code),
  INDEX idx_language (language_code),
  INDEX idx_status (translation_status)
);
```

### Translation Glossary
```sql
CREATE TABLE site_{id}_translation_glossary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  source_language VARCHAR(10),
  target_language VARCHAR(10),
  source_term VARCHAR(200),
  target_term VARCHAR(200),
  context VARCHAR(500),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_translation (source_language, target_language, source_term)
);
```

## URL Structure Examples

### Directory Strategy (Recommended)
```
Default language:
yoursite.com/                    → Home (English)
yoursite.com/about               → About page
yoursite.com/blog/my-post        → Blog post

Other languages:
yoursite.com/es/                 → Inicio (Spanish)
yoursite.com/es/acerca-de        → Página acerca de
yoursite.com/es/blog/mi-articulo → Artículo de blog

yoursite.com/fr/                 → Accueil (French)
yoursite.com/fr/a-propos         → Page à propos
yoursite.com/fr/blog/mon-article → Article de blog
```

### Subdomain Strategy
```
en.yoursite.com/                 → Home (English)
es.yoursite.com/                 → Inicio (Spanish)
fr.yoursite.com/                 → Accueil (French)
```

## Implementation Examples

### Language Detection
```typescript
// lib/language-detector.ts
export function detectLanguage(req: Request): string {
  // 1. Check URL parameter
  const urlLang = getLanguageFromUrl(req.url);
  if (urlLang) return urlLang;
  
  // 2. Check cookie
  const cookieLang = req.cookies.get('language');
  if (cookieLang) return cookieLang;
  
  // 3. Check Accept-Language header
  const headerLang = getBrowserLanguage(req.headers);
  if (headerLang && isSupportedLanguage(headerLang)) {
    return headerLang;
  }
  
  // 4. Check geolocation (optional)
  const geoLang = getLanguageFromGeo(req);
  if (geoLang) return geoLang;
  
  // 5. Fallback to default
  return getDefaultLanguage();
}
```

### Translation Component
```typescript
// components/TranslationEditor.tsx
export function TranslationEditor({ post, languages }: Props) {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Source language */}
      <div>
        <h3>Source ({sourceLanguage})</h3>
        <div className="bg-gray-100 p-4">
          <h2>{post.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </div>
      
      {/* Target language */}
      <div>
        <h3>Translation ({targetLanguage})</h3>
        <input
          type="text"
          placeholder="Translated title"
          value={translation.title}
          onChange={(e) => updateTranslation('title', e.target.value)}
        />
        <RichTextEditor
          value={translation.content}
          onChange={(content) => updateTranslation('content', content)}
        />
        <button onClick={saveTranslation}>
          Save Translation
        </button>
        <button onClick={autoTranslate}>
          Auto-Translate
        </button>
      </div>
    </div>
  );
}
```

### Language Switcher
```typescript
// components/LanguageSwitcher.tsx
export function LanguageSwitcher({ currentLanguage, availableLanguages }: Props) {
  const switchLanguage = async (newLang: string) => {
    // Set cookie
    document.cookie = `language=${newLang}; path=/; max-age=31536000`;
    
    // Get translated URL
    const translatedUrl = await getTranslatedUrl(
      window.location.pathname,
      newLang
    );
    
    // Redirect
    window.location.href = translatedUrl;
  };
  
  return (
    <div className="language-switcher">
      {availableLanguages.map(lang => (
        <button
          key={lang.code}
          className={lang.code === currentLanguage ? 'active' : ''}
          onClick={() => switchLanguage(lang.code)}
        >
          <span className="flag">{lang.flag_emoji}</span>
          <span className="name">{lang.native_name}</span>
        </button>
      ))}
    </div>
  );
}
```

### Get Translated Content
```typescript
// lib/translations.ts
export async function getTranslatedPost(
  postId: number,
  language: string
): Promise<Post> {
  // Get base post
  const post = await getPost(postId);
  
  // If requesting default language, return as-is
  if (language === getDefaultLanguage()) {
    return post;
  }
  
  // Get translation
  const translation = await db.query(
    'SELECT * FROM post_translations WHERE post_id = ? AND language_code = ?',
    [postId, language]
  );
  
  if (translation) {
    // Merge translation with post
    return {
      ...post,
      title: translation.title || post.title,
      slug: translation.slug || post.slug,
      content: translation.content || post.content,
      excerpt: translation.excerpt || post.excerpt,
      seo_title: translation.seo_title || post.seo_title,
      seo_description: translation.seo_description || post.seo_description,
      language: language,
      translation_status: translation.translation_status
    };
  }
  
  // No translation, return original with warning
  return {
    ...post,
    language: language,
    translation_status: 'pending',
    _warning: 'No translation available'
  };
}
```

### Auto-Translation
```typescript
// lib/auto-translate.ts
export async function autoTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  provider: 'google' | 'deepl' = 'google'
): Promise<string> {
  if (provider === 'google') {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          key: process.env.GOOGLE_TRANSLATE_API_KEY
        })
      }
    );
    
    const data = await response.json();
    return data.data.translations[0].translatedText;
  }
  
  // DeepL implementation
  // ...
}

// Translate entire post
export async function autoTranslatePost(
  postId: number,
  targetLanguage: string
) {
  const post = await getPost(postId);
  const defaultLang = getDefaultLanguage();
  
  const translatedTitle = await autoTranslate(
    post.title,
    defaultLang,
    targetLanguage
  );
  
  const translatedContent = await autoTranslate(
    post.content,
    defaultLang,
    targetLanguage
  );
  
  const translatedExcerpt = await autoTranslate(
    post.excerpt,
    defaultLang,
    targetLanguage
  );
  
  // Save translation
  await saveTranslation(postId, targetLanguage, {
    title: translatedTitle,
    content: translatedContent,
    excerpt: translatedExcerpt,
    slug: generateSlug(translatedTitle, targetLanguage),
    translation_status: 'auto'
  });
}
```

### SEO Meta Tags
```typescript
// Add hreflang tags for SEO
export function getHreflangTags(
  post: Post,
  availableLanguages: Language[]
): string {
  const tags: string[] = [];
  
  for (const lang of availableLanguages) {
    const url = getTranslatedUrl(post, lang.code);
    tags.push(
      `<link rel="alternate" hreflang="${lang.locale}" href="${url}" />`
    );
  }
  
  // Add x-default for default language
  const defaultUrl = getTranslatedUrl(post, getDefaultLanguage());
  tags.push(
    `<link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`
  );
  
  return tags.join('\n');
}
```

## Admin Interface Features

### Language Settings
- Add/remove languages
- Configure language codes and locales
- Set default language
- Enable/disable languages
- Order languages (for switcher display)

### Translation Dashboard
- Overview of translation status
- Progress bars per language
- Untranslated content list
- Outdated translations
- Bulk translation actions

### Translation Workflow
1. Create content in default language
2. Mark for translation
3. Translator gets notification
4. Translate content
5. Review translation
6. Publish translation

## Implementation Phases

### Phase 1: Foundation (2-3 weeks)
- Database schema
- Language management
- Basic translation storage
- Language detection

### Phase 2: UI & Workflow (3-4 weeks)
- Translation editor
- Language switcher
- Admin interface
- URL routing

### Phase 3: Advanced Features (2-3 weeks)
- Auto-translation integration
- Translation memory
- Glossary management
- RTL support

### Phase 4: SEO & Performance (1-2 weeks)
- Hreflang tags
- Sitemap generation
- Caching per language
- Search functionality

### Phase 5: Polish (1-2 weeks)
- Documentation
- Migration tools
- Testing
- Performance optimization

## User Stories

1. **Content Manager**: "I want to easily translate my content into multiple languages"
2. **Site Visitor**: "I want to view the site in my native language automatically"
3. **Translator**: "I want a clean interface to translate content side-by-side"
4. **SEO Specialist**: "I want proper hreflang tags and language-specific URLs"

## Success Metrics
- Translation completion rate: >80%
- Language detection accuracy: >95%
- Translation time reduction: >60% (with auto-translate)
- User satisfaction with correct language: >90%

## Dependencies
- URL routing system
- Advanced caching (per-language caching)
- Activity logging (translation tracking)

## Risks & Mitigation
- **Risk**: Poor auto-translation quality
  - **Mitigation**: Mark auto-translations, require review, allow editing
  
- **Risk**: Performance impact of language detection
  - **Mitigation**: Caching, cookie storage, efficient detection
  
- **Risk**: SEO issues with duplicate content
  - **Mitigation**: Proper hreflang tags, canonical URLs, sitemaps

## Related Features
- Advanced SEO tools (hreflang, international SEO)
- REST API (language-specific endpoints)
- Theme system (RTL theme support)

