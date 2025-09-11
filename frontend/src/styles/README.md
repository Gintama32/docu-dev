# CSS Architecture

This directory contains the refactored CSS architecture for better maintainability and consistency.

## File Structure

### 1. `variables.css`
- **Purpose**: Single source of truth for all design tokens
- **Contents**:
  - Spacing scale (--space-xs to --space-3xl)
  - Component spacing (padding, margins)
  - Typography scale and weights
  - Border radius values
  - Transitions
  - Z-index scale
  - Breakpoints
  - Color themes (light/dark)
  - Backward compatibility mappings

### 2. `utilities.css`
- **Purpose**: Reusable utility classes
- **Contents**:
  - Spacing utilities (p-*, m-*)
  - Flexbox utilities
  - Text utilities
  - Border utilities
  - Shadow utilities
  - Background utilities
  - Responsive utilities

### 3. `components.css`
- **Purpose**: Reusable component styles
- **Contents**:
  - Button system (.btn, .btn-primary, etc.)
  - Form system (.form-group, .form-input, etc.)
  - Card components
  - Page layouts
  - Modals
  - Status badges
  - Empty states
  - Loading states

### 4. `mobile.css`
- **Purpose**: All mobile-specific styles in one place
- **Contents**:
  - Single breakpoint: 768px
  - Mobile layout adjustments
  - Touch-friendly sizing
  - Mobile navigation
  - Responsive tables
  - Extra small device styles (480px)

## Usage Guidelines

### Spacing
Always use spacing variables instead of hardcoded values:
```css
/* Good */
padding: var(--space-lg);
margin-bottom: var(--space-xl);

/* Bad */
padding: 16px;
margin-bottom: 24px;
```

### Buttons
Use the button component classes:
```html
<!-- Primary button -->
<button class="btn btn-primary">Save</button>

<!-- Secondary button -->
<button class="btn btn-secondary">Cancel</button>

<!-- Danger button -->
<button class="btn btn-danger">Delete</button>
```

### Forms
Use the form component classes:
```html
<div class="form-group">
  <label class="form-label">Name</label>
  <input type="text" class="form-input" />
  <span class="form-help">Enter your full name</span>
</div>
```

### Mobile Development
- All mobile styles are in `mobile.css`
- Use consistent breakpoint: 768px
- Ensure touch targets are at least 44px (--min-touch-target)
- Test on actual devices

## Migration Notes

The old class names are still supported for backward compatibility:
- `.button-primary` → `.btn.btn-primary`
- `.button-secondary` → `.btn.btn-secondary`
- `--background-primary` → `--bg-primary`
- etc.

These will be phased out once all components are updated.