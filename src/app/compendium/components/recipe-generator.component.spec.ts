import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ValueProvider } from '@angular/core';
import { CompendiumRoutes } from '../../p4/compendium.module';
import { FusionDataService } from '../../pq2/fusion-data.service';
import { RecipeGeneratorContainerComponent } from '../../pq2/components/recipe-generator.component';
import { CompendiumTranslator } from '../models/compendium-translator';
import { RecipeGeneratorComponent } from './recipe-generator.component';

// Exercise the actual P4G route configuration, skill data and fusion calculators.
describe('restored Persona 4 Golden recipe generator', () => {
  let fixture: ComponentFixture<RecipeGeneratorContainerComponent>;
  let generator: RecipeGeneratorComponent;
  let data: FusionDataService;

  beforeEach(async () => {
    localStorage.clear();
    const config = (CompendiumRoutes[0].providers[0] as ValueProvider).useValue;
    data = new FusionDataService(config, new CompendiumTranslator(), { url: '/p4g/recipes' } as Router);
    await TestBed.configureTestingModule({
      imports: [RecipeGeneratorContainerComponent],
      providers: [{ provide: FusionDataService, useValue: data }]
    }).compileComponents();
    fixture = TestBed.createComponent(RecipeGeneratorContainerComponent);
    fixture.detectChanges();
    generator = fixture.debugElement.query(By.directive(RecipeGeneratorComponent)).componentInstance;
  });

  function checkChains() {
    const { chain1, chain2, stepR, result } = generator.recipe;
    expect(chain1.length).toBeGreaterThan(0);
    expect(chain2.length).toBeGreaterThan(0);
    expect(stepR).toContain(chain1.at(-1));
    expect(stepR).toContain(chain2.at(-1));
    const comp = data.compendium$();
    const chart = data.squareChart$().normalChart;
    for (const chain of [chain1, chain2]) {
      for (let i = 0; i < chain.length - 2; i += 2) {
        const special = comp.getSpecialNameEntries(chain[i + 2]);
        if (special.length) {
          expect([chain[i], ...chain[i + 1].split(' x ')].sort()).toEqual([...special].sort());
        } else {
          expect(data.fusionCalculator.getFusions(chain[i], comp, chart)
            .some(p => p.name1 === chain[i + 1] && p.name2 === chain[i + 2])).toBe(true);
        }
      }
    }
    if (comp.getSpecialNameEntries(result).length) {
      expect([...stepR].sort()).toEqual([...comp.getSpecialNameEntries(result)].sort());
    } else if (stepR.length === 3) {
      expect(data.triFissionCalculator.getFusions(result, comp, data.squareChart$())
        .some(p => [p.name1, p.name2, p.name3].sort().join('|') === [...stepR].sort().join('|'))).toBe(true);
    } else {
      expect(data.fissionCalculator.getFusions(result, comp, chart)
        .some(p => [p.name1, p.name2].sort().join('|') === [...stepR].sort().join('|'))).toBe(true);
    }
  }

  it('shows the original target controls and eight skill rows', () => {
    expect(data.compConfig.appTitle).toBe('Persona 4 Golden');
    expect(generator.form.controls.demon.value.name).toBe('Pixie');
    expect(fixture.nativeElement.querySelectorAll('[formArrayName="ingreds"] tr').length).toBe(10);
    expect(fixture.nativeElement.querySelector('[formControlName="race"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[formControlName="demonL"]')).toBeNull();
    checkChains();
  });

  it('changes the target through the rendered race and Persona dropdowns', () => {
    const race: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="race"]');
    race.value = 'Magician';
    race.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const target: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="demon"]');
    target.selectedIndex = 1;
    target.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(generator.recipe.result).toBe(generator.demons.Magician[1].name);
    checkChains();
  });

  it('calculates and displays valid chains carrying eight selected skills', () => {
    generator.setDemon(data.compendium$().getDemon('Pixie'));
    // Eight transferable passive skills avoid conflicting elemental inheritance.
    const selected = generator.skills['pas'].slice(0, 8);
    expect(selected.length).toBe(8);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[formArrayName="ingreds"] tr');
    selected.forEach((skill, index) => {
      const elem: HTMLSelectElement = rows[index + 2].querySelector('[formControlName="elem"]');
      elem.value = 'pas';
      elem.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const picker: HTMLSelectElement = rows[index + 2].querySelector('[formControlName="skill"]');
      picker.selectedIndex = Array.from(picker.options).findIndex(o => o.textContent.trim() === skill.name);
      picker.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    });
    fixture.detectChanges();
    expect(Object.keys(generator.recipe.skills).sort()).toEqual(selected.map(s => s.name).sort());
    checkChains();
    const chainDemons = [...generator.recipe.chain1, ...generator.recipe.chain2];
    for (const source of Object.values(generator.recipe.skills)) expect(chainDemons).toContain(source);
    expect(fixture.nativeElement.textContent).toContain('= Pixie');
    expect(generator.recipeLeft.length + generator.recipeRight.length).toBeGreaterThan(0);
  });

  it('generates a triple fusion for a P4G triple-only Arcana', () => {
    generator.setDemon(data.compendium$().getDemon('Legion'));
    expect(generator.recipe.stepR.length).toBe(3);
    checkChains();
  });

  it('preserves elemental inheritance along the generated skill chain', () => {
    const skill = data.compendium$().getSkill('Garu');
    const source = generator.learnedBy[skill.name][0];
    const row = generator.form.controls.ingreds['controls'][3];
    row.patchValue({ elem: skill.inherit, skill, demon: source });
    expect(generator.recipe.skills.Garu).toBe(source.name);
    checkChains();
    const code = 1 << (generator.recipeConfig.inheritElems.length - 1
      - generator.recipeConfig.inheritElems.indexOf(skill.inherit));
    let reachesFinalFusion = false;
    for (const chain of [generator.recipe.chain1, generator.recipe.chain2]) {
      let carriesSkill = chain[0] === source.name;
      for (let i = 0; i < chain.length - 2; i += 2) {
        carriesSkill = carriesSkill || chain[i + 1] === source.name;
        if (carriesSkill) {
          expect(data.compendium$().getDemon(chain[i + 2]).inherits & code).toBe(code);
        }
      }
      reachesFinalFusion ||= carriesSkill;
    }
    expect(reachesFinalFusion).toBe(true);
    expect(data.compendium$().getDemon(generator.recipe.result).inherits & code).toBe(code);
  });

  it('keeps the original no-recipes result for a target without a valid fusion', () => {
    generator.setDemon(data.compendium$().getDemon('Izanagi'));
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(generator.recipe.stepR).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No recipes found');
  });

});
