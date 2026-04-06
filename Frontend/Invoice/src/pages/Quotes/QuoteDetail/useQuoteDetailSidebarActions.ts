import { toast } from "react-toastify";
import { getQuotes } from "../../salesModel";

export const useQuoteDetailSidebarActions = (ctx: any) => {
  const {
    quote,
    quoteId,
    allQuotes,
    setQuote,
    setLoading,
    setAllQuotes,
    setShowSidebarMoreDropdown,
    navigate,
    appendActivityLog,
    getQuotesDep,
  } = ctx;

  const handleQuoteClick = (id: any) => {
    const nextQuote = (allQuotes || []).find((q: any) => q?.id === id) || null;
    if (nextQuote) {
      setQuote(nextQuote);
      setLoading(false);
    }
    navigate(`/sales/quotes/${id}`, {
      state: { preloadedQuote: nextQuote, preloadedQuotes: allQuotes },
    });
  };

  const handleCreateNewQuote = () => {
    navigate("/sales/quotes/new");
  };

  const handleImportQuotes = () => {
    setShowSidebarMoreDropdown(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
              const existingQuotes = await getQuotes();
              const importedQuotes = importedData.map((q, index) => ({
                ...q,
                id: `quote-${Date.now()}-${index}`,
                createdAt: new Date().toISOString(),
              }));
              const allQuotesNext = [...existingQuotes, ...importedQuotes];
              localStorage.setItem("taban_books_quotes", JSON.stringify(allQuotesNext));
              try {
                const quotes = await getQuotesDep();
                setAllQuotes(quotes);
                toast.success(`Successfully imported ${importedQuotes.length} quote(s).`);
                await appendActivityLog("Import Quotes", `Imported ${importedQuotes.length} quote(s).`, "success");
              } catch (error) {
                console.error("Error reloading quotes after import:", error);
                setAllQuotes(allQuotesNext);
                toast.success(`Successfully imported ${importedQuotes.length} quote(s).`);
                await appendActivityLog("Import Quotes", `Imported ${importedQuotes.length} quote(s).`, "success");
              }
            } else {
              toast.error("Invalid file format. Please upload a valid JSON file.");
            }
          } catch (error) {
            toast.error("Error importing quotes. Please check the file format.");
            console.error("Import error:", error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportQuotes = async () => {
    setShowSidebarMoreDropdown(false);
    try {
      const quotes = await getQuotesDep();
      const dataStr = JSON.stringify(quotes, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotes-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Quotes exported successfully.");
      await appendActivityLog("Export Quotes", "Quotes were exported as JSON.", "info");
    } catch (error) {
      console.error("Error exporting quotes:", error);
      toast.error("Failed to export quotes. Please try again.");
    }
  };

  return {
    handleQuoteClick,
    handleCreateNewQuote,
    handleImportQuotes,
    handleExportQuotes,
  };
};

