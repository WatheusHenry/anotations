# Atualização da Funcionalidade de Imagem

## Mudanças Realizadas

### 1. Remoção do Atributo `capture="environment"`
- **Antes**: O input de arquivo tinha `capture="environment"` que forçava o uso da câmera
- **Depois**: Removido o atributo para permitir seleção da galeria

### 2. Atualização do Ícone e Labels
- **Ícone**: Mudado de câmera para um ícone de imagem/galeria mais genérico
- **Aria-label**: Atualizado de "Adicionar foto" para "Adicionar imagem"
- **Classe CSS**: Renomeada de `camera-btn` para `image-btn`

### 3. Melhorias na Experiência do Usuário
- **Mensagem de erro**: Melhorada para ser mais clara sobre tipos de arquivo aceitos
- **Comportamento**: Agora o usuário pode escolher entre:
  - Tirar uma nova foto (se disponível no dispositivo)
  - Selecionar uma imagem da galeria
  - Fazer upload de qualquer arquivo de imagem

## Como Funciona Agora

1. **Desktop**: Abre o seletor de arquivos padrão do sistema
2. **Mobile**: Apresenta opções para câmera ou galeria (dependendo do navegador)
3. **Validação**: Continua verificando tipo de arquivo e tamanho (máx 5MB)

## Arquivos Modificados

- `src/App.vue`: 
  - Removido `capture="environment"` do input
  - Atualizado ícone e labels
  - Renomeada classe CSS
  - Melhorada mensagem de erro

## Funcionalidades Mantidas

- ✅ Upload de imagens
- ✅ Validação de tipo de arquivo
- ✅ Validação de tamanho (5MB máx)
- ✅ Conversão para Base64
- ✅ Armazenamento no IndexedDB
- ✅ Exibição de imagens nas notas
- ✅ Visualização em modal
- ✅ Feedback visual ao adicionar

A funcionalidade agora é mais flexível e permite ao usuário escolher a fonte da imagem conforme sua preferência.