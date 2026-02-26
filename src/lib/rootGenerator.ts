export type VerbFormType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X' | 'Xa' | 'Xb';

export interface GeneratedVerbForm {
    form: VerbFormType;
    perfect: string;
    imperfect: string;
    passiveParticiple: string;
    activeParticiple: string;
    verbalNoun: string;
}

function isGuttural(c: string) {
    return ['għ', 'ħ', 'h', 'q', "'"].includes(c);
}

function hasIorE(v: string) {
    return ['i', 'e'].includes(v);
}

function hasIorEorO(v: string) {
    return ['i', 'e', 'o'].includes(v);
}

// ─── Triliteral Strong ──────────────────────────────────────────────────────────
export function generateTriliteralStrong(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    // I
    const f1_perf = `${C1}${pv1}${C2}${pv2}${C3}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f1_pass = `m${ipv1}${C1}${C2}u${C3}`;
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const a2 = isGuttural(C3) ? 'a' : 'e';
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = `${C1}${C2}i${C3}`; // simplified VN rule

    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    // II
    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;

    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    // III
    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    const f3_impf = `j${f3_perf}`;
    const f3_pass = `m${f3_perf}`;

    forms.push({ form: 'III', perfect: f3_perf, imperfect: f3_impf, passiveParticiple: f3_pass, activeParticiple: '-', verbalNoun: '-' });

    // IV
    const f4_perf = `${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`; // Image: joktob. Formula: j ipv1 C1 C2 ipv2 C3 => j o k t o b. Correct.
    const f4_act = `mi${C1}${C2}${pv2}${C3}`;
    const d1 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `i${C1}${C2}${d1}${C3}`;

    // Note: Image adds mikteb to pass participle too, but prompt says "-". We follow prompt.
    // Wait, let's output the prompt exactly.
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    // V
    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    // VI
    const f6_perf = `t${f3_perf}`;
    const e1 = hasIorE(pv1) ? 'ie' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    // VII
    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    // VIII
    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}i${C3}` });

    // IX
    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    // Xa (Standard X)
    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}i${C3}` });

    // Xb (st + Form II shape)
    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    // Keep X for backward compatibility (maps to Xa)
    //forms.push({ ...forms[forms.length - 2], form: 'X' });

    return forms;
}

// ─── Triliteral Geminated ───────────────────────────────────────────────────────
export function generateTriliteralGeminated(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    // I (Triliteral Geminated usually C2=C3, so rules use C1, C2, C3, where C2=C3 string-wise)
    // Based on user prompt "Triliteral Geminated"
    // I: C1pv1C2C3, ‘j’C1ipv2C2C3, ‘m’(if C1 == guttaral, then a, else i)C1C2uC2, C1(if pv1 == i or e or e, then ie, else a)C2(if C3 == guttaral, then a, else e)C3, C1C2iC3
    const f1_perf = `${C1}${pv1}${C2}${C3}`;
    const f1_impf = `j${C1}${ipv2}${C2}${C3}`;
    const g1 = isGuttural(C1) ? 'a' : 'i';
    const f1_pass = `m${g1}${C1}${C2}u${C3}`; // C3 used instead of trailing C2 per obvious pattern in strong
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const a2 = isGuttural(C3) ? 'a' : 'e';
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = `${C1}${C2}i${C3}`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    // II. C1pvC2C2pvC3 ... exactly SAME as Strong form 2. For geminated, C2=C3 isn't literally C2 and C2. The base root is provided. 
    // Wait, geminate root e.g. ħ-b-b. C1=ħ, C2=b, C3=b.
    // If we just apply strong rules to forms:
    // Prompt says: "II. C1pvC2C2pvC3, jPERF, mPERF..." exactly like strong.
    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: `j${f3_perf}`, passiveParticiple: `m${f3_perf}`, activeParticiple: '-', verbalNoun: '-' });

    // IV. ipv1C1C2ipv2C3, ‘j’ipv1C1C2ipv2C3... same as strong.
    const f4_perf = `${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_act = `mi${C1}${C2}${pv2}${C3}`;
    const d1 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `i${C1}${C2}${d1}${C3}`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a'; // geminate rule: 'e' instead of 'ie' it seems
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}i${C3}` });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    // Xa (Standard X)
    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}i${C3}` });

    // Xb (st + Form II shape)
    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    // Keep X for backward compatibility
    //forms.push({ ...forms[forms.length - 2], form: 'X' });

    return forms;
}

// ─── Triliteral Assimilative ──────────────────────────────────────────────────────
export function generateTriliteralAssimilative(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    // I. C1pvC2pvC3, ‘j’ipv1C2ipv2C3, ‘m’ipv1C2uC2, C1(if pv1 == i or e or e, then ie, else a)C2(...)C3, ‘u’C2iC3
    const f1_perf = `${C1}${pv1}${C2}${pv2}${C3}`;
    const f1_impf = `j${ipv1}${C2}${ipv2}${C3}`;
    const f1_pass = `m${ipv1}${C2}u${C3}`; // Again adjusting C2uC2 to C2uC3 based on logic
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const a2 = isGuttural(C3) ? 'a' : 'e';
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = `u${C2}i${C3}`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const f2_vn = `te${C1}${C2}i${C3}`; // teC1C2iC3 or tuC2iC3. Using teC1C2iC3.
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: `j${f3_perf}`, passiveParticiple: `m${f3_perf}`, activeParticiple: '-', verbalNoun: '-' });

    // IV. uC2ipv2C3, ‘j’ipv1C2ipv2C3, -, ‘mi’C1C2pv2C3, (if C1 == w, then u, else i)C2(if PERF vowel set == a-a, then a, else ie)C3
    const f4_perf = `u${C2}${ipv2}${C3}`;
    const f4_impf = `j${ipv1}${C2}${ipv2}${C3}`;
    const f4_act = `mi${C1}${C2}${pv2}${C3}`;
    const h1 = C1 === 'w' ? 'u' : 'i';
    const h2 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `${h1}${C2}${h2}${C3}`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}i${C3}` });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    // Xa (Standard X)
    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}i${C3}` });

    // Xb (st + Form II shape)
    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    // Keep X for backward compatibility
    //forms.push({ ...forms[forms.length - 2], form: 'X' });

    return forms;
}

// ─── Triliteral Hollow ──────────────────────────────────────────────────────────
export function generateTriliteralHollow(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    // I. C1pv1C3, ‘j’C1ipv2C3, ‘m(if C1 == guttural, then a or e, else i)’C1uC3, C1(if pv1 == i or e or e, then e, else a)’jje’C3, C1pv1C2C3
    const f1_perf = `${C1}${pv1}${C3}`;
    const f1_impf = `j${C1}${ipv2}${C3}`;
    const i1 = isGuttural(C1) ? 'a' : 'i';
    const f1_pass = `m${i1}${C1}u${C3}`;
    const i2 = hasIorE(pv1) ? 'e' : 'a';
    const f1_act = `${C1}${i2}jje${C3}`;
    const f1_vn = `${C1}${pv1}${C2}${C3}`; // simplified
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    // II, III mostly same pattern rules logic fallback to strong
    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    forms.push({ form: 'II', perfect: f2_perf, imperfect: `j${f2_perf}`, passiveParticiple: `m${f2_perf}`, activeParticiple: `${C1}${pv1}${C2}${C2}${b1}${C3}`, verbalNoun: `t${b2}${C1}${C2}i${C3}` });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: `j${f3_perf}`, passiveParticiple: `m${f3_perf}`, activeParticiple: '-', verbalNoun: '-' });

    // IV. pv1C1C2pv2C3, ‘j’ipv1C1C2ipv2C3...
    const f4_perf = `${pv1}${C1}${C2}${pv2}${C3}`;
    const f4_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_act = `mi${C1}i${C3}`; // prompt: miC1iC3
    const f4_vn = `i${C1}${C2}${(pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie'}${C3}`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}i${C3}` });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    // Xa (Standard X)
    const f10a_perf = `st${pv1}${C1}${pv1}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}ie${C3}` });

    // Xb (st + Form II shape)
    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    // Keep X for backward compatibility
    //forms.push({ ...forms[forms.length - 2], form: 'X' });

    return forms;
}

// ─── Triliteral Defective ───────────────────────────────────────────────────────
export function generateTriliteralDefective(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    // I. C1pvC2pv, ‘j’ipv1C1C2ipv2, ‘m’ipv1C1C2i, C1(if pv1 == i or e or e, then ie, else a)C2i, C1pv1C2u (simplified VN)
    const f1_perf = `${C1}${pv1}${C2}${pv2}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}`;
    const f1_pass = `m${ipv1}${C1}${C2}i`;
    const f1_act = `${C1}${hasIorE(pv1) ? 'ie' : 'a'}${C2}i`;
    const f1_vn = `${C1}${pv1}${C2}u`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    // II. C1pvC2C2pv, jC1ipv1C2C2ipv2, mC1ipv1C2C2ipv2, C1pvC2C2ej, ‘t’(if C1 == guttaral OR pv == a-a, then a, else i)C1C2ija
    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}`;
    const f2_impf = `j${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_pass = `m${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_act = `${C1}${pv1}${C2}${C2}ej`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}ija`;
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    // III. C1(...)C2pv2, jC1(...)C2pv2, mC1(...)C2i, -, -
    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}`;
    const f3_impf = `j${C1}${c1}${C2}${pv2}`;
    const f3_pass = `m${C1}${c1}${C2}i`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: f3_impf, passiveParticiple: f3_pass, activeParticiple: '-', verbalNoun: '-' });

    // IV. ipv1C1C2ipv2, ‘jo’C1C2i, -, ‘mo’C1C2i, (i)C1C2(...)ja
    const f4_perf = `${ipv1}${C1}${C2}${ipv2}`;
    const f4_impf = `jo${C1}${C2}i`;
    const f4_act = `mo${C1}${C2}i`;
    const h2 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `(i)${C1}${C2}${h2}ja`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${C1}${pv1}${C2}${C2}${pv2}`; // tFORM2 perf
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}a`.replace(/undefined/g, '') });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}a`.replace(/undefined/g, '') });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    // VIII. C1’t’pvC2pv, jiPERF, miPERF, -, C1’t’pvC2pv
    const f8_perf = `${C1}t${pv1}${C2}${pv2}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}${pv2}` });

    // IX
    forms.push({ form: 'IX', perfect: '-', imperfect: '-', passiveParticiple: '-', activeParticiple: '-', verbalNoun: '-' });

    // Xa
    // Xa (Standard X)
    const f10a_perf = `st${pv1}${C1}${C2}${pv2}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}ija` });

    // Xb (st + Form II shape)
    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}ija` });

    // Keep X for backward compatibility
    //forms.push({ ...forms[forms.length - 2], form: 'X' });

    return forms;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────────
export function generateRootForms(
    consonants: string,
    strength: string,
    weakClass: string | null | undefined,
    pvSet: string,
    ipvSet: string
): GeneratedVerbForm[] {
    const arr = consonants.split('-');
    const C1 = arr[0] || '';
    const C2 = arr[1] || '';
    const C3 = arr[2] || '';
    const [pv1 = 'a', pv2 = 'a'] = pvSet.split('-');
    const [ipv1 = 'i', ipv2 = 'a'] = ipvSet.split('-');

    if (strength === 'weak' && weakClass === 'defective') {
        return generateTriliteralDefective(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'weak' && weakClass === 'hollow') {
        return generateTriliteralHollow(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'weak' && weakClass === 'assimilative') {
        return generateTriliteralAssimilative(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'strong' && (C2 === C3 && C2 !== '')) {
        // Triliteral Geminated usually implied by C2=C3 string, or engine flags
        return generateTriliteralGeminated(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    // Default: Triliteral Strong
    return generateTriliteralStrong(C1, C2, C3, pv1, pv2, ipv1, ipv2);
}

export type FormMarker = 'plain' | 'theoretical' | 'auto_generated';

export interface MarkedVerbForm {
    form: VerbFormType;
    perfect: { value: string; marker: FormMarker };
    imperfect: { value: string; marker: FormMarker };
    passiveParticiple: { value: string; marker: FormMarker };
    activeParticiple: { value: string; marker: FormMarker };
    verbalNoun: { value: string; marker: FormMarker };
}

/**
 * Applies *, ✦, or no mark depending on existing attested entries.
 */
export function markGeneratedForms(
    generated: GeneratedVerbForm[],
    attestedLemmas: Set<string> // Set of exact words that exist as entries (or their forms)
): MarkedVerbForm[] {
    // A form row is deemed "attested" if its PERFECT form is in the DB.
    // E.g. Form I is attested if 'kiteb' is in attestedLemmas.

    // Check which forms represent an entry
    const attestedForms = new Set<VerbFormType>();
    for (const g of generated) {
        if (attestedLemmas.has(g.perfect)) {
            attestedForms.add(g.form);
        }
    }

    const reconstructableForms = new Set<VerbFormType>();
    // Logic: Form III is reconstructable if Form VI exists
    if (attestedForms.has('VI')) reconstructableForms.add('III');
    // Form II reconstructable if Form V exists
    if (attestedForms.has('V')) reconstructableForms.add('II');
    // Form I reconstructable if Form VIII exists
    if (attestedForms.has('VIII')) reconstructableForms.add('I');

    // Return marked data
    return generated.map((g) => {
        const isReconstructableForm = reconstructableForms.has(g.form);

        // First determine the marker for the Lemma (Perfect form)
        let lemmaMarker: FormMarker = 'auto_generated';
        if (g.perfect === '-') {
            lemmaMarker = 'plain';
        } else if (attestedLemmas.has(g.perfect)) {
            lemmaMarker = 'plain';
        } else if (isReconstructableForm) {
            lemmaMarker = 'theoretical';
        }

        const applyMarker = (val: string, isLemma: boolean = false): { value: string; marker: FormMarker } => {
            if (val === '-') return { value: val, marker: 'plain' };

            // If the specific form is in DB, it never has a mark
            if (attestedLemmas.has(val)) {
                return { value: val, marker: 'plain' };
            }

            if (!isLemma && lemmaMarker === 'plain') {
                // If the lemma is plain (attested), but this specific derived form is NOT in DB,
                // mark it as theoretical (*) instead of plain (link).
                return { value: val, marker: 'theoretical' };
            }

            // Otherwise, inherit the lemma's marker (theoretical or auto_generated)
            return { value: val, marker: lemmaMarker };
        };

        return {
            form: g.form,
            perfect: applyMarker(g.perfect, true),
            imperfect: applyMarker(g.imperfect),
            passiveParticiple: applyMarker(g.passiveParticiple),
            activeParticiple: applyMarker(g.activeParticiple),
            verbalNoun: applyMarker(g.verbalNoun),
        };
    });
}
