interface Project {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  project: string;
  date: string;
  hours: number;
}

export const sampleProjects: Project[] = [
  { id: "PRJ-001", name: "Website Redesign" },
  { id: "PRJ-002", name: "Warehouse Setup" }
];

export const sampleTimeEntries: TimeEntry[] = [
  { id: "TE-001", project: "Website Redesign", date: "2025-12-01", hours: 3 },
  { id: "TE-002", project: "Warehouse Setup", date: "2025-12-02", hours: 5 }
];

