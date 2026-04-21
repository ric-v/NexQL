import { expect } from 'chai';
import { coerceConnectionPassword } from '../../utils/coerceConnectionPassword';

describe('coerceConnectionPassword', () => {
  const cases: Array<{ input: unknown; out: string | undefined }> = [
    { input: undefined, out: undefined },
    { input: null, out: undefined },
    { input: '', out: undefined },
    { input: '1412', out: '1412' },
    { input: 1412, out: '1412' },
    { input: 0, out: '0' },
    { input: true, out: undefined },
    { input: {}, out: undefined },
  ];

  for (const { input, out } of cases) {
    it(`maps ${JSON.stringify(input)} to ${JSON.stringify(out)}`, () => {
      expect(coerceConnectionPassword(input)).to.equal(out);
    });
  }
});
