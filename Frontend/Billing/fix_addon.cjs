
const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\Users\\Taban-pc\\Pictures\\Full System\\Frontend\\Billing\\src\\pages\\Product-Calalog\\addons\\NewAddon\\NewAddon.tsx';

let content = fs.readFileSync(targetFile, 'utf8');

const oldBody = `  try {
    const rows = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return dedupe(
      (Array.isArray(rows) ? rows : [])
        .filter((row: any) => !(row?.active === false || String(row?.status || "").toLowerCase() === "inactive"))
        .map((row: any) => String(row?.name || row?.displayName || row?.product || ""))
    );
  } catch {
    return [];
  }`;

const newBody = `  try {
    const res = await productsAPI.list({ status: "active" });
    let names: string[] = [];
    if (res && (res as any).success && Array.isArray((res as any).data)) {
      names = (res as any).data.map((row: any) => String(row?.name || row?.displayName || row?.productName || row?.product || ""));
    } else {
      const rows = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
      names = (Array.isArray(rows) ? rows : [])
        .filter((row: any) => !(row?.active === false || String(row?.status || "").toLowerCase() === "inactive"))
        .map((row: any) => String(row?.name || row?.displayName || row?.product || ""));
    }
    return dedupe(names);
  } catch {
    return [];
  }`;

const oldLoad = `    const load = () => {
      const names = readActiveProductNames();`;

const newLoad = `    const load = async () => {
      const names = await fetchActiveProductNames();`;

const oldOnSaved = `  const onNewProductSaved = () => {
    const names = readActiveProductNames();`;

const newOnSaved = `  const onNewProductSaved = async () => {
    const names = await fetchActiveProductNames();`;

if (content.includes(oldBody)) {
    content = content.replace(oldBody, newBody);
    console.log("Function body replaced");
} else {
    console.log("Function body not found");
}

if (content.includes(oldLoad)) {
    content = content.replace(oldLoad, newLoad);
    console.log("load() replaced");
} else {
    console.log("load() not found");
}

if (content.includes(oldOnSaved)) {
    content = content.replace(oldOnSaved, newOnSaved);
    console.log("onNewProductSaved() replaced");
} else {
    console.log("onNewProductSaved() not found");
}

fs.writeFileSync(targetFile, content);
console.log("Done");
