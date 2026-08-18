import { GamificationService, XP_TABLE } from './gamification.service';

describe('GamificationService.levelFor', () => {
  it('nível 1 no início', () => {
    expect(GamificationService.levelFor(0)).toBe(1);
    expect(GamificationService.levelFor(99)).toBe(1);
  });

  it('sobe de nível conforme a curva sqrt(xp/100)+1', () => {
    expect(GamificationService.levelFor(100)).toBe(2);
    expect(GamificationService.levelFor(400)).toBe(3);
    expect(GamificationService.levelFor(900)).toBe(4);
    expect(GamificationService.levelFor(2500)).toBe(6);
  });

  it('é monotônica (nunca diminui com mais XP)', () => {
    let prev = 0;
    for (let xp = 0; xp <= 10_000; xp += 137) {
      const lvl = GamificationService.levelFor(xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});

describe('XP_TABLE (espelha o PRD)', () => {
  it('mantém os valores canônicos de XP por atividade', () => {
    expect(XP_TABLE.LESSON).toBe(10);
    expect(XP_TABLE.QUIZ).toBe(25);
    expect(XP_TABLE.LAB).toBe(100);
    expect(XP_TABLE.CHALLENGE).toBe(150);
    expect(XP_TABLE.EXAM).toBe(200);
    expect(XP_TABLE.PATH_COMPLETION).toBe(500);
  });
});
