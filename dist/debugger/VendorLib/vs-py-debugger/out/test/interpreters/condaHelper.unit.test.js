"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

const assert = require("assert");

const chai_1 = require("chai");

const conda_1 = require("../../client/interpreter/locators/services/conda");

const condaHelper_1 = require("../../client/interpreter/locators/services/condaHelper"); // tslint:disable-next-line:max-func-body-length


suite('Interpreters display name from Conda Environments', () => {
  const condaHelper = new condaHelper_1.CondaHelper();
  test('Must return default display name for invalid Conda Info', () => {
    assert.equal(condaHelper.getDisplayName(), conda_1.AnacondaDisplayName, 'Incorrect display name');
    assert.equal(condaHelper.getDisplayName({}), conda_1.AnacondaDisplayName, 'Incorrect display name');
  });
  test('Must return at least Python Version', () => {
    const info = {
      python_version: '3.6.1.final.10'
    };
    const displayName = condaHelper.getDisplayName(info);
    assert.equal(displayName, conda_1.AnacondaDisplayName, 'Incorrect display name');
  });
  test('Must return info without first part if not a python version', () => {
    const info = {
      'sys.version': '3.6.1 |Anaconda 4.4.0 (64-bit)| (default, May 11 2017, 13:25:24) [MSC v.1900 64 bit (AMD64)]'
    };
    const displayName = condaHelper.getDisplayName(info);
    assert.equal(displayName, 'Anaconda 4.4.0 (64-bit)', 'Incorrect display name');
  });
  test('Must return info without prefixing with word \'Python\'', () => {
    const info = {
      python_version: '3.6.1.final.10',
      'sys.version': '3.6.1 |Anaconda 4.4.0 (64-bit)| (default, May 11 2017, 13:25:24) [MSC v.1900 64 bit (AMD64)]'
    };
    const displayName = condaHelper.getDisplayName(info);
    assert.equal(displayName, 'Anaconda 4.4.0 (64-bit)', 'Incorrect display name');
  });
  test('Must include Ananconda name if Company name not found', () => {
    const info = {
      python_version: '3.6.1.final.10',
      'sys.version': '3.6.1 |4.4.0 (64-bit)| (default, May 11 2017, 13:25:24) [MSC v.1900 64 bit (AMD64)]'
    };
    const displayName = condaHelper.getDisplayName(info);
    assert.equal(displayName, `4.4.0 (64-bit) : ${conda_1.AnacondaDisplayName}`, 'Incorrect display name');
  });
  test('Parse conda environments', () => {
    // tslint:disable-next-line:no-multiline-string
    const environments = `
# conda environments:
#
base                  *  /Users/donjayamanne/anaconda3
one1                     /Users/donjayamanne/anaconda3/envs/one
two2 2                   /Users/donjayamanne/anaconda3/envs/two 2
three3                   /Users/donjayamanne/anaconda3/envs/three
                         /Users/donjayamanne/anaconda3/envs/four
                         /Users/donjayamanne/anaconda3/envs/five 5`;
    const expectedList = [{
      name: 'base',
      path: '/Users/donjayamanne/anaconda3'
    }, {
      name: 'one1',
      path: '/Users/donjayamanne/anaconda3/envs/one'
    }, {
      name: 'two2 2',
      path: '/Users/donjayamanne/anaconda3/envs/two 2'
    }, {
      name: 'three3',
      path: '/Users/donjayamanne/anaconda3/envs/three'
    }, {
      name: 'four',
      path: '/Users/donjayamanne/anaconda3/envs/four'
    }, {
      name: 'five 5',
      path: '/Users/donjayamanne/anaconda3/envs/five 5'
    }];
    const list = condaHelper.parseCondaEnvironmentNames(environments);
    chai_1.expect(list).deep.equal(expectedList);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmRhSGVscGVyLnVuaXQudGVzdC5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImFzc2VydCIsInJlcXVpcmUiLCJjaGFpXzEiLCJjb25kYV8xIiwiY29uZGFIZWxwZXJfMSIsInN1aXRlIiwiY29uZGFIZWxwZXIiLCJDb25kYUhlbHBlciIsInRlc3QiLCJlcXVhbCIsImdldERpc3BsYXlOYW1lIiwiQW5hY29uZGFEaXNwbGF5TmFtZSIsImluZm8iLCJweXRob25fdmVyc2lvbiIsImRpc3BsYXlOYW1lIiwiZW52aXJvbm1lbnRzIiwiZXhwZWN0ZWRMaXN0IiwibmFtZSIsInBhdGgiLCJsaXN0IiwicGFyc2VDb25kYUVudmlyb25tZW50TmFtZXMiLCJleHBlY3QiLCJkZWVwIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztBQUFFQyxFQUFBQSxLQUFLLEVBQUU7QUFBVCxDQUE3Qzs7QUFDQSxNQUFNQyxNQUFNLEdBQUdDLE9BQU8sQ0FBQyxRQUFELENBQXRCOztBQUNBLE1BQU1DLE1BQU0sR0FBR0QsT0FBTyxDQUFDLE1BQUQsQ0FBdEI7O0FBQ0EsTUFBTUUsT0FBTyxHQUFHRixPQUFPLENBQUMsa0RBQUQsQ0FBdkI7O0FBQ0EsTUFBTUcsYUFBYSxHQUFHSCxPQUFPLENBQUMsd0RBQUQsQ0FBN0IsQyxDQUNBOzs7QUFDQUksS0FBSyxDQUFDLG1EQUFELEVBQXNELE1BQU07QUFDN0QsUUFBTUMsV0FBVyxHQUFHLElBQUlGLGFBQWEsQ0FBQ0csV0FBbEIsRUFBcEI7QUFDQUMsRUFBQUEsSUFBSSxDQUFDLHlEQUFELEVBQTRELE1BQU07QUFDbEVSLElBQUFBLE1BQU0sQ0FBQ1MsS0FBUCxDQUFhSCxXQUFXLENBQUNJLGNBQVosRUFBYixFQUEyQ1AsT0FBTyxDQUFDUSxtQkFBbkQsRUFBd0Usd0JBQXhFO0FBQ0FYLElB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MURJLENBQUwiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG5jb25zdCBjaGFpXzEgPSByZXF1aXJlKFwiY2hhaVwiKTtcclxuY29uc3QgY29uZGFfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvaW50ZXJwcmV0ZXIvbG9jYXRvcnMvc2VydmljZXMvY29uZGFcIik7XHJcbmNvbnN0IGNvbmRhSGVscGVyXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2ludGVycHJldGVyL2xvY2F0b3JzL3NlcnZpY2VzL2NvbmRhSGVscGVyXCIpO1xyXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWZ1bmMtYm9keS1sZW5ndGhcclxuc3VpdGUoJ0ludGVycHJldGVycyBkaXNwbGF5IG5hbWUgZnJvbSBDb25kYSBFbnZpcm9ubWVudHMnLCAoKSA9PiB7XHJcbiAgICBjb25zdCBjb25kYUhlbHBlciA9IG5ldyBjb25kYUhlbHBlcl8xLkNvbmRhSGVscGVyKCk7XHJcbiAgICB0ZXN0KCdNdXN0IHJldHVybiBkZWZhdWx0IGRpc3BsYXkgbmFtZSBmb3IgaW52YWxpZCBDb25kYSBJbmZvJywgKCkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjb25kYUhlbHBlci5nZXREaXNwbGF5TmFtZSgpLCBjb25kYV8xLkFuYWNvbmRhRGlzcGxheU5hbWUsICdJbmNvcnJlY3QgZGlzcGxheSBuYW1lJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbmRhSGVscGVyLmdldERpc3BsYXlOYW1lKHt9KSwgY29uZGFfMS5BbmFjb25kYURpc3BsYXlOYW1lLCAnSW5jb3JyZWN0IGRpc3BsYXkgbmFtZScpO1xyXG4gICAgfSk7XHJcbiAgICB0ZXN0KCdNdXN0IHJldHVybiBhdCBsZWFzdCBQeXRob24gVmVyc2lvbicsICgpID0+IHtcclxuICAgICAgICBjb25zdCBpbmZvID0ge1xyXG4gICAgICAgICAgICBweXRob25fdmVyc2lvbjogJzMuNi4xLmZpbmFsLjEwJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBjb25kYUhlbHBlci5nZXREaXNwbGF5TmFtZShpbmZvKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoZGlzcGxheU5hbWUsIGNvbmRhXzEuQW5hY29uZGFEaXNwbGF5TmFtZSwgJ0luY29ycmVjdCBkaXNwbGF5IG5hbWUnKTtcclxuICAgIH0pO1xyXG4gICAgdGVzdCgnTXVzdCByZXR1cm4gaW5mbyB3aXRob3V0IGZpcnN0IHBhcnQgaWYgbm90IGEgcHl0aG9uIHZlcnNpb24nLCAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgaW5mbyA9IHtcclxuICAgICAgICAgICAgJ3N5cy52ZXJzaW9uJzogJzMuNi4xIHxBbmFjb25kYSA0LjQuMCAoNjQtYml0KXwgKGRlZmF1bHQsIE1heSAxMSAyMDE3LCAxMzoyNToyNCkgW01TQyB2LjE5MDAgNjQgYml0IChBTUQ2NCldJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBjb25kYUhlbHBlci5nZXREaXNwbGF5TmFtZShpbmZvKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoZGlzcGxheU5hbWUsICdBbmFjb25kYSA0LjQuMCAoNjQtYml0KScsICdJbmNvcnJlY3QgZGlzcGxheSBuYW1lJyk7XHJcbiAgICB9KTtcclxuICAgIHRlc3QoJ011c3QgcmV0dXJuIGluZm8gd2l0aG91dCBwcmVmaXhpbmcgd2l0aCB3b3JkIFxcJ1B5dGhvblxcJycsICgpID0+IHtcclxuICAgICAgICBjb25zdCBpbmZvID0ge1xyXG4gICAgICAgICAgICBweXRob25fdmVyc2lvbjogJzMuNi4xLmZpbmFsLjEwJyxcclxuICAgICAgICAgICAgJ3N5cy52ZXJzaW9uJzogJzMuNi4xIHxBbmFjb25kYSA0LjQuMCAoNjQtYml0KXwgKGRlZmF1bHQsIE1heSAxMSAyMDE3LCAxMzoyNToyNCkgW01TQyB2LjE5MDAgNjQgYml0IChBTUQ2NCldJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBjb25kYUhlbHBlci5nZXREaXNwbGF5TmFtZShpbmZvKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoZGlzcGxheU5hbWUsICdBbmFjb25kYSA0LjQuMCAoNjQtYml0KScsICdJbmNvcnJlY3QgZGlzcGxheSBuYW1lJyk7XHJcbiAgICB9KTtcclxuICAgIHRlc3QoJ011c3QgaW5jbHVkZSBBbmFuY29uZGEgbmFtZSBpZiBDb21wYW55IG5hbWUgbm90IGZvdW5kJywgKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGluZm8gPSB7XHJcbiAgICAgICAgICAgIHB5dGhvbl92ZXJzaW9uOiAnMy42LjEuZmluYWwuMTAnLFxyXG4gICAgICAgICAgICAnc3lzLnZlcnNpb24nOiAnMy42LjEgfDQuNC4wICg2NC1iaXQpfCAoZGVmYXVsdCwgTWF5IDExIDIwMTcsIDEzOjI1OjI0KSBbTVNDIHYuMTkwMCA2NCBiaXQgKEFNRDY0KV0nXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGNvbmRhSGVscGVyLmdldERpc3BsYXlOYW1lKGluZm8pO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChkaXNwbGF5TmFtZSwgYDQuNC4wICg2NC1iaXQpIDogJHtjb25kYV8xLkFuYWNvbmRhRGlzcGxheU5hbWV9YCwgJ0luY29ycmVjdCBkaXNwbGF5IG5hbWUnKTtcclxuICAgIH0pO1xyXG4gICAgdGVzdCgnUGFyc2UgY29uZGEgZW52aXJvbm1lbnRzJywgKCkgPT4ge1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1tdWx0aWxpbmUtc3RyaW5nXHJcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYFxyXG4jIGNvbmRhIGVudmlyb25tZW50czpcclxuI1xyXG5iYXNlICAgICAgICAgICAgICAgICAgKiAgL1VzZXJzL2RvbmpheWFtYW5uZS9hbmFjb25kYTNcclxub25lMSAgICAgICAgICAgICAgICAgICAgIC9Vc2Vycy9kb25qYXlhbWFubmUvYW5hY29uZGEzL2VudnMvb25lXHJcbnR3bzIgMiAgICAgICAgICAgICAgICAgICAvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL3R3byAyXHJcbnRocmVlMyAgICAgICAgICAgICAgICAgICAvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL3RocmVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL2ZvdXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC9Vc2Vycy9kb25qYXlhbWFubmUvYW5hY29uZGEzL2VudnMvZml2ZSA1YDtcclxuICAgICAgICBjb25zdCBleHBlY3RlZExpc3QgPSBbXHJcbiAgICAgICAgICAgIHsgbmFtZTogJ2Jhc2UnLCBwYXRoOiAnL1VzZXJzL2RvbmpheWFtYW5uZS9hbmFjb25kYTMnIH0sXHJcbiAgICAgICAgICAgIHsgbmFtZTogJ29uZTEnLCBwYXRoOiAnL1VzZXJzL2RvbmpheWFtYW5uZS9hbmFjb25kYTMvZW52cy9vbmUnIH0sXHJcbiAgICAgICAgICAgIHsgbmFtZTogJ3R3bzIgMicsIHBhdGg6ICcvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL3R3byAyJyB9LFxyXG4gICAgICAgICAgICB7IG5hbWU6ICd0aHJlZTMnLCBwYXRoOiAnL1VzZXJzL2RvbmpheWFtYW5uZS9hbmFjb25kYTMvZW52cy90aHJlZScgfSxcclxuICAgICAgICAgICAgeyBuYW1lOiAnZm91cicsIHBhdGg6ICcvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL2ZvdXInIH0sXHJcbiAgICAgICAgICAgIHsgbmFtZTogJ2ZpdmUgNScsIHBhdGg6ICcvVXNlcnMvZG9uamF5YW1hbm5lL2FuYWNvbmRhMy9lbnZzL2ZpdmUgNScgfVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IGNvbmRhSGVscGVyLnBhcnNlQ29uZGFFbnZpcm9ubWVudE5hbWVzKGVudmlyb25tZW50cyk7XHJcbiAgICAgICAgY2hhaV8xLmV4cGVjdChsaXN0KS5kZWVwLmVxdWFsKGV4cGVjdGVkTGlzdCk7XHJcbiAgICB9KTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbmRhSGVscGVyLnVuaXQudGVzdC5qcy5tYXAiXX0=