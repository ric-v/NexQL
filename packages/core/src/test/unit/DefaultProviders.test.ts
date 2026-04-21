import { expect } from 'chai';
import { DefaultTypeClassifier } from '../../core/db/DefaultTypeClassifier';
import { DefaultTransactionSyntax } from '../../core/db/DefaultTransactionSyntax';
import { DefaultCompletionProvider } from '../../core/db/DefaultCompletionProvider';

describe('DefaultProviders', () => {
  describe('DefaultTypeClassifier', () => {
    let classifier: DefaultTypeClassifier;

    beforeEach(() => {
      classifier = new DefaultTypeClassifier();
    });

    describe('isNumeric', () => {
      it('returns true for integer types', () => {
        expect(classifier.isNumeric('integer')).to.be.true;
        expect(classifier.isNumeric('INT')).to.be.true;
        expect(classifier.isNumeric('bigint')).to.be.true;
        expect(classifier.isNumeric('smallint')).to.be.true;
        expect(classifier.isNumeric('tinyint')).to.be.true;
        expect(classifier.isNumeric('mediumint')).to.be.true;
      });

      it('returns true for floating-point types', () => {
        expect(classifier.isNumeric('float')).to.be.true;
        expect(classifier.isNumeric('double')).to.be.true;
        expect(classifier.isNumeric('DOUBLE PRECISION')).to.be.true;
        expect(classifier.isNumeric('real')).to.be.true;
      });

      it('returns true for decimal/numeric types', () => {
        expect(classifier.isNumeric('decimal')).to.be.true;
        expect(classifier.isNumeric('numeric')).to.be.true;
        expect(classifier.isNumeric('NUMERIC(10,2)')).to.be.true;
        expect(classifier.isNumeric('money')).to.be.true;
      });

      it('returns true for serial types', () => {
        expect(classifier.isNumeric('serial')).to.be.true;
      });

      it('returns false for non-numeric types', () => {
        expect(classifier.isNumeric('text')).to.be.false;
        expect(classifier.isNumeric('varchar')).to.be.false;
        expect(classifier.isNumeric('boolean')).to.be.false;
        expect(classifier.isNumeric('date')).to.be.false;
        expect(classifier.isNumeric('uuid')).to.be.false;
      });
    });

    describe('isText', () => {
      it('returns true for character types', () => {
        expect(classifier.isText('char')).to.be.true;
        expect(classifier.isText('varchar')).to.be.true;
        expect(classifier.isText('VARCHAR(255)')).to.be.true;
        expect(classifier.isText('nchar')).to.be.true;
        expect(classifier.isText('nvarchar')).to.be.true;
      });

      it('returns true for text types', () => {
        expect(classifier.isText('text')).to.be.true;
        expect(classifier.isText('TEXT')).to.be.true;
        expect(classifier.isText('longtext')).to.be.true;
        expect(classifier.isText('mediumtext')).to.be.true;
        expect(classifier.isText('tinytext')).to.be.true;
        expect(classifier.isText('ntext')).to.be.true;
      });

      it('returns true for clob and string types', () => {
        expect(classifier.isText('clob')).to.be.true;
        expect(classifier.isText('string')).to.be.true;
      });

      it('returns false for non-text types', () => {
        expect(classifier.isText('integer')).to.be.false;
        expect(classifier.isText('boolean')).to.be.false;
        expect(classifier.isText('date')).to.be.false;
        expect(classifier.isText('json')).to.be.false;
      });
    });

    describe('isDate', () => {
      it('returns true for date/time types', () => {
        expect(classifier.isDate('date')).to.be.true;
        expect(classifier.isDate('DATE')).to.be.true;
        expect(classifier.isDate('time')).to.be.true;
        expect(classifier.isDate('timestamp')).to.be.true;
        expect(classifier.isDate('TIMESTAMP WITH TIME ZONE')).to.be.true;
        expect(classifier.isDate('datetime')).to.be.true;
        expect(classifier.isDate('interval')).to.be.true;
        expect(classifier.isDate('year')).to.be.true;
      });

      it('returns false for non-date types', () => {
        expect(classifier.isDate('integer')).to.be.false;
        expect(classifier.isDate('text')).to.be.false;
        expect(classifier.isDate('boolean')).to.be.false;
        expect(classifier.isDate('json')).to.be.false;
      });
    });

    describe('isBoolean', () => {
      it('returns true for boolean types', () => {
        expect(classifier.isBoolean('bool')).to.be.true;
        expect(classifier.isBoolean('boolean')).to.be.true;
        expect(classifier.isBoolean('BOOLEAN')).to.be.true;
        expect(classifier.isBoolean('bit')).to.be.true;
        expect(classifier.isBoolean('BIT')).to.be.true;
      });

      it('returns false for non-boolean types', () => {
        expect(classifier.isBoolean('integer')).to.be.false;
        expect(classifier.isBoolean('text')).to.be.false;
        expect(classifier.isBoolean('date')).to.be.false;
        expect(classifier.isBoolean('varchar')).to.be.false;
      });
    });
  });

  describe('DefaultTransactionSyntax', () => {
    let syntax: DefaultTransactionSyntax;

    beforeEach(() => {
      syntax = new DefaultTransactionSyntax();
    });

    it('begin returns a non-empty string', () => {
      const result = syntax.begin();
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.equal('BEGIN');
    });

    it('commit returns a non-empty string', () => {
      const result = syntax.commit();
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.equal('COMMIT');
    });

    it('rollback returns a non-empty string', () => {
      const result = syntax.rollback();
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.equal('ROLLBACK');
    });
  });

  describe('DefaultCompletionProvider', () => {
    let provider: DefaultCompletionProvider;

    beforeEach(() => {
      provider = new DefaultCompletionProvider();
    });

    it('getKeywords returns a non-empty array of strings', () => {
      const keywords = provider.getKeywords();
      expect(keywords).to.be.an('array');
      expect(keywords.length).to.be.greaterThan(0);
      // Verify common SQL keywords are present
      expect(keywords).to.include('SELECT');
      expect(keywords).to.include('FROM');
      expect(keywords).to.include('WHERE');
      expect(keywords).to.include('INSERT');
      expect(keywords).to.include('UPDATE');
      expect(keywords).to.include('DELETE');
      expect(keywords).to.include('CREATE');
      expect(keywords).to.include('DROP');
    });

    it('getBuiltinFunctions returns a non-empty array of strings', () => {
      const functions = provider.getBuiltinFunctions();
      expect(functions).to.be.an('array');
      expect(functions.length).to.be.greaterThan(0);
      // Verify common aggregate functions are present
      expect(functions).to.include('COUNT');
      expect(functions).to.include('SUM');
      expect(functions).to.include('AVG');
      expect(functions).to.include('MIN');
      expect(functions).to.include('MAX');
    });

    it('getSystemSchemas returns a non-empty array of strings', () => {
      const schemas = provider.getSystemSchemas();
      expect(schemas).to.be.an('array');
      expect(schemas.length).to.be.greaterThan(0);
      expect(schemas).to.include('information_schema');
    });
  });
});
