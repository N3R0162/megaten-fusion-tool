import { Component, ChangeDetectionStrategy, Input, OnChanges } from '@angular/core';
import { UntypedFormGroup as FormGroup, UntypedFormBuilder as FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SkillLevelToShortStringPipeLocale, TranslateCompPipe } from '../pipes';
import { Demon, Skill, FusionRecipe, Compendium, SquareChart, RecipeGeneratorConfig } from '../../compendium/models';
import { createSkillsRecipe } from '../models/recipe-generator';
import Translations from '../data/translations.json';

@Component({
  selector: 'app-recipe-generator',
  imports: [ReactiveFormsModule, TranslateCompPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form">
      <h2>{{ msgs.RecipeGenerator | translateComp:lang }}</h2>
      <aside class="legacy-generator-notice" aria-label="Generator version">
        <strong>Legacy fusion generator · Older version</strong>
        <p>This fork restores the older recipe generator from
          <a href="https://github.com/aqiu384/megaten-fusion-tool">aqiu384’s Fusion Tools</a>.
          It is maintained separately from the
          <a href="https://aqiu384.github.io/megaten-fusion-tool/">upstream version ↗</a>.</p>
      </aside>
      <table class="entry-table">
        <tr><th colspan="2" class="title">{{ msgs.Target | translateComp:lang }}</th></tr>
        <tr>
          <th style="width: 40%;">{{ msgs.Race | translateComp:lang }}</th>
          <th style="width: 60%;">{{ msgs.Name | translateComp:lang }}</th>
        </tr>
        <tr>
          <td>
            <select formControlName="race" (change)="setDemon(demons[form.controls.race.value][0])">
              @for (race of races; track $index) { <option [value]="race">{{ race }}</option> }
            </select>
          </td>
          <td>
            <select formControlName="demon" (change)="setDemon(form.controls.demon.value)">
              @for (demon of demons[form.controls.race.value]; track $index) { <option [ngValue]="demon">{{ demon.name }}</option> }
            </select>
          </td>
        </tr>
      </table>
      <table formArrayName="ingreds" class="entry-table">
        <tr><th colspan="5" class="title">{{ msgs.IncludeIngredients | translateComp:lang }}</th></tr>
        <tr>
          <th style="width: 20%">{{ msgs.FilterBy | translateComp:lang }}</th>
          <th style="width: 10%">{{ msgs.Elem | translateComp:lang }}</th>
          <th style="width: 25%">{{ msgs.Skill | translateComp:lang }}</th>
          <th style="width: 20%">{{ msgs.Race | translateComp:lang }}</th>
          <th style="width: 25%">{{ msgs.Ingredient | translateComp:lang }}</th>
        </tr>
        @for (ingred of form.controls.ingreds['controls']; track $index; let i = $index) { <ng-container [formGroupName]="i">
          @if (i < maxSkills) { <tr>
            <td>
              <label>{{ msgs.LearnsSkill | translateComp:lang }}{{ i + 1 }}
                <input formControlName="searchSkill" type="checkbox"
                (change)="setIngredDemon(ingred)">
              </label>
            </td>
            <td>
              <select formControlName="elem"
                [attr.disabled]="!ingred.controls.searchSkill.value || null"
                (change)="setIngredElem(ingred)">
                <option value="-">-</option>
                @for (elem of elems; track $index) { <option [value]="elem">{{ recipeConfig.displayElems[elem] || elem }}</option> }
              </select>
            </td>
            <td>
              <select formControlName="skill"
                [attr.disabled]="!ingred.controls.searchSkill.value || null"
                (change)="setIngredDemon(ingred)">
                @for (skill of skills[ingred.controls.elem.value]; track $index) { <option [ngValue]="skill">{{ skill.name }}</option> }
              </select>
            </td>
            <td>
              <select formControlName="race"
                [attr.disabled]="ingred.controls.searchSkill.value || null"
                (change)="setIngredDemon(ingred)">
                <option value="-">-</option>
                @for (race of races; track $index) { <option [value]="race">{{ race }}</option> }
              </select>
            </td>
            <td>
              @if (ingred.controls.searchSkill.value) { <select formControlName="demon">
                @for (demon of learnedBy[ingred.controls.skill.value.name]; track $index) { <option [ngValue]="demon">{{ demon.name }}</option> }
              </select> }
              @if (!ingred.controls.searchSkill.value) { <select formControlName="demon">
                @for (demon of demons[ingred.controls.race.value]; track $index) { <option [ngValue]="demon">{{ demon.name }}</option> }
              </select> }
            </td>
          </tr> }
        </ng-container> }
      </table>
      @if (recipe) { <table class="entry-table">
        <tr><th colspan="2" class="title">{{ msgs.FusionRecipe | translateComp:lang }}</th></tr>
        <tr>
          <th>{{ msgs.LeftChain | translateComp:lang }}</th>
          <th>{{ msgs.RightChain | translateComp:lang }}</th>
        </tr>
        <tr>
          @if (recipeLeft.length) { <td style="width: 50%"><ul>@for (step of recipeLeft; track $index) { <li>{{ step }}</li> }</ul></td> }
          @if (!recipeLeft.length) { <td style="width: 50%" style="padding: 1em; text-align: center;">{{ msgs.NoRecipesFound | translateComp:lang }}</td> }
          @if (recipeRight.length) { <td style="width: 50%"><ul>@for (step of recipeRight; track $index) { <li>{{ step }}</li> }</ul></td> }
          @if (!recipeRight.length) { <td style="width: 50%" style="padding: 1em; text-align: center;">{{ msgs.NoRecipesFound | translateComp:lang }}</td> }
        </tr>
        @if (fusionPrereq) { <tr><td colspan="2" style="padding: 1em; text-align: center;">
          {{ msgs.SpecialFusionCondition | translateComp:lang }}: {{ fusionPrereq }}
        </td></tr> }
        <tr><td colspan="2" style="padding: 1em; text-align: center;">
          @if (recipe.stepR.length) { <ng-container>
            {{ recipeResult.join(' x ') }} = {{ recipe.result }}<br>
            [{{ resultSkills.join(', ') }}]
          </ng-container> }
          @if (!recipe.stepR.length) { <ng-container>{{ msgs.NoRecipesFound | translateComp:lang }}</ng-container> }
        </td></tr>
      </table> }
    </form>
  `,
  styles: [`
    .legacy-generator-notice {
      box-sizing: border-box;
      max-width: 760px;
      margin: 0 auto 1.5rem;
      padding: 1rem 1.25rem;
      border: 1px solid #9d854b;
      border-left: 4px solid #e2bc62;
      border-radius: 4px;
      background: #302b20;
      color: #f4e9cb;
      line-height: 1.6;
      text-align: center;
    }
    .legacy-generator-notice strong { color: #ffe09a; }
    .legacy-generator-notice p { margin: 0.4rem 0 0; }
    .legacy-generator-notice a { text-decoration: underline; text-underline-offset: 0.15em; }
    ul { padding: 0 1em; list-style: none; }
    td select { min-height: 25px; width: 100%; }
  `]
})
export class RecipeGeneratorComponent implements OnChanges {
  @Input() maxSkills = 8;
  @Input() compendium: Compendium;
  @Input() squareChart: SquareChart;
  @Input() recipeConfig: RecipeGeneratorConfig;
  @Input() lang = 'en';

  internalMaxSkills = 9;
  range99 = Array(99);
  races: string[];
  elems: string[];
  demons: { [race: string]: Demon[] } = {};
  skills: { [elem: string]: Skill[] } = {};
  learnedBy: { [skill: string]: Demon[] } = {};
  fusionPrereq = '';
  form: FormGroup;
  recipe: FusionRecipe;
  recipeLeft: string[];
  recipeRight: string[];
  recipeResult: string[];
  resultSkills: string[];
  msgs = Translations.RecipeGeneratorComponent;
  skillLevelPipe = new SkillLevelToShortStringPipeLocale();

  blankDemon: Demon = {
    name: '-', race: '-', lvl: 0, currLvl: 0, price: 0, inherits: 0,
    skills: {}, stats: [], resists: [], affinities: [],
    fusion: 'normal', prereq: '', searchTags: '-'
  };

  blankSkill: Skill = {
    name: '-', element: '-', inherit: '-', rank: 99, cost: 0,
    effect: '', target: '', level: 0, learnedBy: [{ demon: '-', level: 0 }]
  };

  constructor(private fb: FormBuilder) { this.createForm(); }

  ngOnChanges() { this.initDropdowns(); }

  createForm() {
    const ingreds = [];

    for (let i = 0; i < this.internalMaxSkills; i++) {
      ingreds.push(this.fb.group({ searchSkill: true, elem: '-', skill: this.blankSkill, race: { value: '-', disabled: true }, demon: this.blankDemon }));
    }

    this.form = this.fb.group({
      race: '-',
      demon: this.blankDemon,
      ingreds: this.fb.array(ingreds)
    });

    this.form.valueChanges.subscribe(form => {
      if (this.form.valid) {
        const ingreds = form.ingreds.filter(i => i.demon.name !== '-' && i.demon.name !== form.demon.name).map(i => i.demon.name);
        const skills: { [skill: string]: string } = {};

        for (const ingred of form.ingreds) {
          if (ingred.searchSkill && ingred.skill.name !== '-') {
            skills[ingred.skill.name] = ingred.demon.name;
          }
        }

        this.updateRecipe(createSkillsRecipe(form.demon.name, ingreds, skills, this.compendium, this.squareChart, this.recipeConfig));
      }
    });
  }

  setIngredElem(ingred: FormGroup) {
    ingred.controls.skill.setValue(this.skills[ingred.controls.elem.value][0]);
    this.setIngredDemon(ingred);
  }

  setIngredDemon(ingred: FormGroup) {
    const searchSkill: boolean = ingred.controls.searchSkill.value;
    const demon: Demon[] = searchSkill ? this.learnedBy[ingred.controls.skill.value.name] : this.demons[ingred.controls.race.value];
    ingred.controls.demon.setValue(demon[0]);
  }

  updateRecipe(recipe: FusionRecipe) {
    const skillRef: { [demon: string]: string[] } = {};

    for (const [skill, demon] of Object.entries(recipe.skills)) {
      if (!skillRef[demon]) { skillRef[demon] = []; }
      const slvl = this.compendium.getDemon(demon).skills[skill];
      skillRef[demon].push(`${skill} ${this.skillLevelPipe.transform(slvl, this.lang)}`.trim());
    }

    this.recipe = recipe;
    this.recipeLeft = this.decodeRecipechain(recipe.chain1, skillRef);
    this.recipeRight = this.decodeRecipechain(recipe.chain2, skillRef);
    this.resultSkills = [];
    this.recipeResult = [];
    this.fusionPrereq = this.compendium.getDemon(recipe.result).prereq || '';

    for (const result of recipe.stepR) {
      this.recipeResult.push(skillRef[result] ? `${result} [${skillRef[result].join(', ')}]` : result);
    }

    for (const [skill, slvl] of Object.entries(this.compendium.getDemon(recipe.result).skills)
      .filter(s => s[1] < 2000)
      .sort((a, b) => a[1] - b[1])
    ) {
      this.resultSkills.push(`${skill} ${this.skillLevelPipe.transform(slvl, this.lang)}`.trim());
    }
  }

  private decodeRecipechain(chain: string[], skillRef: { [demon: string]: string[] }): string[] {
    const steps = [];

    for (let i = 0; i < chain.length - 2; i += 2) {
      const skills1 = skillRef[chain[i]] ? '[' + skillRef[chain[i]].join(', ') + '] ' : '';
      const skills2 = skillRef[chain[i + 1]] ? '[' + skillRef[chain[i + 1]].join(', ') + '] ' : '';
      steps.push(`${chain[i]} ${skills1}x ${chain[i + 1]} ${skills2}= ${chain[i + 2]}`);
    }

    return steps;
  }

  initDropdowns() {
    if (!this.recipeConfig || !this.compendium || !this.squareChart) { return; }

    this.demons = { '-': [this.blankDemon] };
    this.skills = { '-': [this.blankSkill] };
    this.learnedBy = { '-': [this.blankDemon] };

    for (const demon of this.compendium.allDemons) {
      if (!demon.isEnemy && demon.fusion !== 'party' && demon.fusion !== 'enemy') {
        if (!this.demons[demon.race]) { this.demons[demon.race] = []; }
        this.demons[demon.race].push(demon);

        for (const sname of Object.keys(demon.skills)) {
          if (!this.learnedBy[sname]) { this.learnedBy[sname] = []; }
          this.learnedBy[sname].push(demon);
        }
      }
    }

    for (const skill of this.compendium.allSkills.filter(s => s.rank < 50 && s.learnedBy.length > 0)) {
      if (!this.skills[skill.inherit]) { this.skills[skill.inherit] = []; }
      this.skills[skill.inherit].push(skill);
    }

    for (const demonList of Object.values(this.demons)) {
      demonList.sort((a, b) => a.lvl - b.lvl);
    }

    for (const demonList of Object.values(this.learnedBy)) {
      demonList.sort((a, b) => a.lvl - b.lvl);
    }

    for (const skillList of Object.values(this.skills)) {
      skillList.sort((a, b) => a.rank - b.rank);
    }

    this.races = this.recipeConfig.races.filter(r => this.demons[r]);
    this.elems = this.recipeConfig.skillElems.filter(e => this.skills[e]);
    this.setDemon(this.compendium.getDemon(this.recipeConfig.defaultDemon));
  }

  setDemon(demon: Demon) {
    const excludeElems: string[] = [];
    const { inheritElems } = this.recipeConfig;
    const innateSkills = Object.entries(demon.skills)
      .slice(0, this.internalMaxSkills)
      .filter(s => s[1] < 2)
      .map(s => this.compendium.getSkill(s[0]));

    const learnedSkills = Object.entries(demon.skills)
      .slice(0, this.internalMaxSkills)
      .filter(s => s[1] < 100)
      .map(s => this.compendium.getSkill(s[0]));

    for (let i = 0; i < inheritElems.length; i++) {
      if (!(demon.inherits & (1 << i))) {
        excludeElems.push(inheritElems[inheritElems.length - i - 1]);
      }
    }

    this.skills[this.blankSkill.element] = [this.blankSkill].concat(learnedSkills);
    this.elems = this.recipeConfig.skillElems.filter(e => this.skills[e] && !excludeElems.includes(e));
    this.form.patchValue({
      race: demon.race,
      demon: demon,
      ingreds: innateSkills
        .concat(Array(this.internalMaxSkills - innateSkills.length).fill(this.blankSkill))
        .map(s => ({ searchSkill: true, elem: '-', skill: s, race: '-', demon: s.name !== '-' ? demon : this.blankDemon }))
    });
  }
}
