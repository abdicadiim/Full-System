const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join('Frontend', 'Invoice', 'src', 'pages', 'Customers');
const sourcePath = path.join(root, 'Customers.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const sf = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const customersFn = sf.statements.find((stmt) => ts.isFunctionDeclaration(stmt) && stmt.name?.text === 'Customers');
if (!customersFn || !customersFn.body) throw new Error('Could not find Customers function');
const bodyStmts = customersFn.body.statements;

function collectNames(startLine, endLine, extraNames = []) {
  const names = new Set(extraNames);
  for (const stmt of bodyStmts) {
    const line = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1;
    if (line < startLine || line > endLine) continue;
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const walk = (node) => {
          if (ts.isIdentifier(node)) {
            names.add(node.text);
            return;
          }
          if (ts.isArrayBindingPattern(node) || ts.isObjectBindingPattern(node)) {
            for (const el of node.elements) {
              if (ts.isBindingElement(el)) walk(el.name);
            }
          }
        };
        walk(decl.name);
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      names.add(stmt.name.text);
    }
  }
  return [...names];
}

function extractLines(ranges) {
  return ranges.map(([start, end]) => lines.slice(start - 1, end).join('\n')).join('\n');
}

function formatNames(names, indent = '  ', perLine = 6) {
  const unique = [...new Set(names)].filter(Boolean).sort();
  const out = [];
  for (let i = 0; i < unique.length; i += perLine) {
    out.push(indent + unique.slice(i, i + perLine).join(', '));
  }
  return out.join(',\n');
}

function writeFile(relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'));
}

const importBlock = lines.slice(0, 13).join('\n');
const stateNames = collectNames(28, 855);
const viewNames = collectNames(857, 1519, ['defaultCustomerViews']);
const actionNames = collectNames(1520, 2145);
const allControllerNames = [...new Set([...stateNames, ...viewNames, ...actionNames])];

function buildHook({ file, name, ranges, inputNames = [], extraPrelude = [], extraImports = [], returnNames = [] }) {
  const body = extractLines(ranges);
  const header = [importBlock, ...extraImports].join('\n');
  const inputLine = inputNames.length > 0
    ? `  const {\n${formatNames(inputNames, '    ')}\n  } = controller as any;\n`
    : '';
  const prelude = extraPrelude.length > 0 ? extraPrelude.join('\n') + '\n' : '';
  const namesToReturn = returnNames.length > 0 ? returnNames : collectNamesFromRanges(ranges);
  const returnLine = `  return {\n${formatNames(namesToReturn, '    ')}\n  };`;
  const content = `${header}\n\nexport function ${name}(controller: any = {}) {\n${inputLine}${prelude}${body}\n${returnLine}\n}\n`;
  writeFile(file, content);
}

function collectNamesFromRanges(ranges) {
  const names = [];
  for (const [start, end] of ranges) names.push(...collectNames(start, end));
  return [...new Set(names)];
}

function buildComponent({ file, name, ranges, wrapReturn = false }) {
  const body = extractLines(ranges);
  const header = importBlock;
  const destructure = `  const {\n${formatNames(allControllerNames, '    ')}\n  } = controller as any;\n`;
  const wrappedBody = wrapReturn ? `  return (\n${body}\n  );` : body;
  const content = `${header}\n\nexport default function ${name}({ controller }: { controller: any }) {\n${destructure}${wrappedBody}\n}\n`;
  writeFile(file, content);
}

buildHook({
  file: 'useCustomersState.ts',
  name: 'useCustomersState',
  ranges: [[28, 855]],
  returnNames: stateNames,
});

buildHook({
  file: 'useCustomersView.ts',
  name: 'useCustomersView',
  ranges: [[857, 1519]],
  inputNames: stateNames,
  extraImports: ['import { DEFAULT_CUSTOMER_VIEWS } from "./Customers.constants";'],
  extraPrelude: ['  const defaultCustomerViews = DEFAULT_CUSTOMER_VIEWS;'],
  returnNames: viewNames,
});

buildHook({
  file: 'useCustomersActions.ts',
  name: 'useCustomersActions',
  ranges: [[1520, 2145]],
  inputNames: [...new Set([...stateNames, ...viewNames])],
  returnNames: actionNames,
});

buildComponent({
  file: 'CustomersMainContent.tsx',
  name: 'CustomersMainContent',
  ranges: [[2146, 2869]],
  wrapReturn: false,
});

buildComponent({
  file: 'CustomersActionModals.tsx',
  name: 'CustomersActionModals',
  ranges: [[2870, 3571], [5495, 5531], [5532, 5701]],
  wrapReturn: true,
});

buildComponent({
  file: 'CustomersSearchModalCore.tsx',
  name: 'CustomersSearchModalCore',
  ranges: [[3677, 4193]],
  wrapReturn: true,
});

buildComponent({
  file: 'CustomersSearchModalSales.tsx',
  name: 'CustomersSearchModalSales',
  ranges: [[4194, 5055]],
  wrapReturn: true,
});

buildComponent({
  file: 'CustomersSearchModalMisc.tsx',
  name: 'CustomersSearchModalMisc',
  ranges: [[5056, 5223]],
  wrapReturn: true,
});

buildComponent({
  file: 'ExportCustomersModal.tsx',
  name: 'ExportCustomersModal',
  ranges: [[5224, 5494]],
  wrapReturn: true,
});

buildComponent({
  file: 'CustomersPreferencesSidebar.tsx',
  name: 'CustomersPreferencesSidebar',
  ranges: [[5702, 5947]],
  wrapReturn: true,
});

buildComponent({
  file: 'ImportCustomersModal.tsx',
  name: 'ImportCustomersModal',
  ranges: [[5948, 6033]],
  wrapReturn: true,
});

buildComponent({
  file: 'CustomizeColumnsModal.tsx',
  name: 'CustomizeColumnsModal',
  ranges: [[6034, 6147]],
  wrapReturn: true,
});

console.log('Generated split customers files.');
