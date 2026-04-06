import fs from "fs";
import path from "path";

const root = path.resolve("src/pages/Customers/CustomerDetailLegacy");
const sourcePath = path.join(root, "CustomerDetail.tsx");
const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split(/\r?\n/);

const importEndIndex = lines.findIndex((line) => line.startsWith("interface ExtendedCustomer"));
if (importEndIndex === -1) {
  throw new Error("Could not find the start of the type declarations.");
}

const importBlock = lines.slice(0, importEndIndex).join("\n");

const sharedImports = [
  `import type { ExtendedCustomer, Transaction, Comment, Mail } from "../CustomerDetail/CustomerDetail.shared";`,
  `import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";`,
].join("\n");

const sharedUtilityNames = new Set([
  "ExtendedCustomer",
  "Transaction",
  "Comment",
  "Mail",
  "formatCurrency",
  "formatDateForDisplay",
  "formatMailDateTime",
  "formatStatusLabel",
  "normalizeInvoiceStatus",
  "normalizeComments",
]);

const parseImportedNames = (block) => {
  const names = new Set();
  const importLines = block.split(/\r?\n/).filter((line) => line.startsWith("import "));
  for (const line of importLines) {
    const namedMatch = line.match(/import\s*{([^}]+)}/);
    if (namedMatch) {
      namedMatch[1]
        .split(",")
        .map((part) => part.trim())
        .forEach((part) => {
          const cleaned = part.replace(/^type\s+/, "");
          const aliasMatch = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
          if (aliasMatch) {
            names.add(aliasMatch[2] || aliasMatch[1]);
          }
        });
    }

    const defaultMatch = line.match(/import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from/);
    if (defaultMatch) {
      names.add(defaultMatch[1]);
    }
  }
  return names;
};

const parseTopLevelDeclarations = (chunkLines) => {
  const names = new Set();
  for (const line of chunkLines) {
    const matches = [...line.matchAll(/^\s{4}(?:const|let|function)\s+(?:\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]|([A-Za-z_][A-Za-z0-9_]*))/g)];
    for (const match of matches) {
      if (match[1]) names.add(match[1]);
      if (match[2]) names.add(match[2]);
      if (match[3]) names.add(match[3]);
    }
  }
  return names;
};

const parseTopLevelIdentifiers = (text) => {
  const tokens = new Set();
  for (const token of text.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || []) {
    tokens.add(token);
  }
  return tokens;
};

const formatObjectAssign = (names) => {
  if (names.length === 0) return "";
  return `    Object.assign(detail, {\n${names.map((name) => `        ${name},`).join("\n")}\n    });\n`;
};

const buildDestructure = (names) => {
  if (names.length === 0) return "";
  return `    const {\n${names.map((name) => `        ${name},`).join("\n")}\n    } = detail as any;\n`;
};

const sliceChunk = (start, end) => lines.slice(start - 1, end).join("\n");

const writeFile = (relativePath, contents) => {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents.replace(/\n{3,}/g, "\n\n"));
};

const importedNames = parseImportedNames(importBlock);
const exposedNames = new Set();

const specs = [
  {
    file: "useCustomerDetailState.ts",
    kind: "hook",
    name: "useCustomerDetailState",
    start: 82,
    end: 805,
    skip: [],
  },
  {
    file: "useCustomerDetailData.ts",
    kind: "hook",
    name: "useCustomerDetailData",
    start: 806,
    end: 1555,
    skip: [],
  },
  {
    file: "useCustomerDetailActions.ts",
    kind: "hook",
    name: "useCustomerDetailActions",
    start: 1556,
    end: 2439,
    skip: [],
  },
  {
    file: "useCustomerDetailTools.ts",
    kind: "hook",
    name: "useCustomerDetailTools",
    start: 2441,
    end: 3294,
    skip: [[3175, 3188], [3283, 3293]],
  },
  {
    file: "useCustomerDetailLists.ts",
    kind: "hook",
    name: "useCustomerDetailLists",
    start: 3295,
    end: 3529,
    skip: [[3389, 3406]],
  },
  {
    file: "useCustomerDetailViewModel.ts",
    kind: "hook",
    name: "useCustomerDetailViewModel",
    start: 3531,
    end: 3589,
    skip: [[3531, 3541]],
  },
  {
    file: "CustomerDetailSidebar.tsx",
    kind: "component",
    name: "CustomerDetailSidebar",
    start: 3590,
    end: 3838,
    skip: [],
  },
  {
    file: "CustomerDetailMainHeader.tsx",
    kind: "component",
    name: "CustomerDetailMainHeader",
    start: 3840,
    end: 4243,
    skip: [],
  },
  {
    file: "CustomerDetailOverviewLeft.tsx",
    kind: "component",
    name: "CustomerDetailOverviewLeft",
    start: 4244,
    end: 4900,
    skip: [],
  },
  {
    file: "CustomerDetailOverviewRight.tsx",
    kind: "component",
    name: "CustomerDetailOverviewRight",
    start: 4900,
    end: 5590,
    skip: [],
  },
  {
    file: "CustomerDetailTransactionsSales.tsx",
    kind: "component",
    name: "CustomerDetailTransactionsSales",
    start: 5590,
    end: 6290,
    skip: [],
  },
  {
    file: "CustomerDetailTransactionsPurchases.tsx",
    kind: "component",
    name: "CustomerDetailTransactionsPurchases",
    start: 6290,
    end: 6840,
    skip: [],
  },
  {
    file: "CustomerDetailPurchasesTab.tsx",
    kind: "component",
    name: "CustomerDetailPurchasesTab",
    start: 6840,
    end: 7420,
    skip: [],
  },
  {
    file: "CustomerDetailPrimaryModals.tsx",
    kind: "component",
    name: "CustomerDetailPrimaryModals",
    start: 7420,
    end: 7924,
    skip: [],
  },
  {
    file: "CustomerDetailAddContactPersonModal.tsx",
    kind: "component",
    name: "CustomerDetailAddContactPersonModal",
    start: 7926,
    end: 8284,
    skip: [],
  },
  {
    file: "CustomerDetailAssociateTagsModal.tsx",
    kind: "component",
    name: "CustomerDetailAssociateTagsModal",
    start: 8287,
    end: 8385,
    skip: [],
  },
  {
    file: "CustomerDetailAddressModal.tsx",
    kind: "component",
    name: "CustomerDetailAddressModal",
    start: 8387,
    end: 8814,
    skip: [],
  },
  {
    file: "CustomerDetailOutlookModal.tsx",
    kind: "component",
    name: "CustomerDetailOutlookModal",
    start: 8816,
    end: 8937,
    skip: [],
  },
  {
    file: "CustomerDetailZohoModal.tsx",
    kind: "component",
    name: "CustomerDetailZohoModal",
    start: 8939,
    end: 9078,
    skip: [],
  },
  {
    file: "CustomerDetailDeleteModals.tsx",
    kind: "component",
    name: "CustomerDetailDeleteModals",
    start: 9080,
    end: 9181,
    skip: [],
  },
  {
    file: "CustomerDetailInviteModal.tsx",
    kind: "component",
    name: "CustomerDetailInviteModal",
    start: 9183,
    end: 9425,
    skip: [],
  },
];

for (const spec of specs) {
  const chunkLines = lines.slice(spec.start - 1, spec.end);
  const chunkText = chunkLines.join("\n");
  const declared = parseTopLevelDeclarations(chunkLines);
  const tokenSet = parseTopLevelIdentifiers(chunkText);

  if (spec.file === "useCustomerDetailActions.ts") {
    declared.delete("buildCustomerSystemMails");
  }

  let transformedLines = chunkLines;
  for (const [skipStart, skipEnd] of spec.skip || []) {
    transformedLines = transformedLines.filter((_, idx) => {
      const lineNumber = spec.start + idx;
      return lineNumber < skipStart || lineNumber > skipEnd;
    });
  }

  if (spec.file === "useCustomerDetailState.ts") {
    const phoneStart = transformedLines.findIndex((line) => line.includes("const phoneCodeOptions = ["));
    const phoneEnd = transformedLines.findIndex((line, index) => index > phoneStart && line.includes("const filteredWorkPhoneCodeOptions = useMemo("));
    if (phoneStart !== -1 && phoneEnd !== -1) {
      transformedLines = [
        ...transformedLines.slice(0, phoneStart),
        "    const phoneCodeOptions = sharedPhoneCodeOptions;",
        "",
        ...transformedLines.slice(phoneEnd),
      ];
    }
  }

  if (spec.file === "useCustomerDetailActions.ts") {
    const mailStart = transformedLines.findIndex((line) => line.includes("const buildCustomerSystemMails = useCallback"));
    const handleProfileStart = transformedLines.findIndex((line, index) => index > mailStart && line.includes("const handleContactPersonProfileFile ="));
    if (mailStart !== -1 && handleProfileStart !== -1) {
      transformedLines = [
        ...transformedLines.slice(0, mailStart),
        ...transformedLines.slice(handleProfileStart),
      ];
    }
  }

  const transformedText = transformedLines.join("\n");
  const extraImports = spec.file === "useCustomerDetailState.ts"
    ? `import { phoneCodeOptions as sharedPhoneCodeOptions } from "../CustomerDetail/phoneCodeOptions";\n`
    : "";

  const rewrittenText = transformedText;

  const visibleNames = [...exposedNames].filter((name) => tokenSet.has(name) && !importedNames.has(name) && !sharedUtilityNames.has(name) && !declared.has(name));
  const usedNames = [...visibleNames].sort();
  const destructure = buildDestructure(usedNames);
  const objectAssign = formatObjectAssign([...declared].sort());

  const baseHeader = `${importBlock}\n${sharedImports}\n${extraImports}`;

  if (spec.kind === "hook") {
    const fileContents = `${baseHeader}\nexport function ${spec.name}(detail: any) {\n${destructure}${rewrittenText}\n${objectAssign}    return detail;\n}\n`;
    writeFile(spec.file, fileContents);
    for (const name of declared) {
      exposedNames.add(name);
    }
  } else {
    const normalizedText = rewrittenText.replace(/\\n\\n/g, "\n\n");
    const body = normalizedText.trimStart().startsWith("return")
      ? normalizedText
      : `    return (\n        <>\n${normalizedText}\n        </>\n    );`;
    const fileContents = `${baseHeader}\nexport default function ${spec.name}({ detail }: { detail: any }) {\n${destructure}${body}\n}\n`;
    writeFile(spec.file, fileContents);
  }
}

console.log(`Generated ${specs.length} CustomerDetail split files.`);
