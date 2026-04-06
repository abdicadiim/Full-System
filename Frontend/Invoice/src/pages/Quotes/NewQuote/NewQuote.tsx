import NewQuoteView from "./NewQuoteView";
import { useNewQuoteController } from "./useNewQuoteController";

const NewQuote = () => {
  const controller = useNewQuoteController();
  return <NewQuoteView controller={controller} />;
};

export default NewQuote;
