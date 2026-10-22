import { describe, expect, it } from 'vitest';
import { registerSettingsSection } from '../src/plugin';
import { registeredSettingsSections } from '../src/widget/contributions';

describe('registerSettingsSection', () => {
    it('lists a registered section until its disposer runs', () => {
        const desc = { title: 'Logo', id: 'logo', placement: 'canvas' as const, rows: [] };
        const off = registerSettingsSection(desc);
        expect(registeredSettingsSections()).toContain(desc);
        off();
        expect(registeredSettingsSections()).not.toContain(desc);
    });
});
