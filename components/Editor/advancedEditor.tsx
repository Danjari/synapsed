const TailwindAdvancedEditor = () => {
    const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
    const [saveStatus, setSaveStatus] = useState("Saved");
    const [charsCount, setCharsCount] = useState();
  
    const [openNode, setOpenNode] = useState(false);
    const [openColor, setOpenColor] = useState(false);
    const [openLink, setOpenLink] = useState(false);
    const [openAI, setOpenAI] = useState(false);
  
    //Apply Codeblock Highlighting on the HTML from editor.getHTML()
    const highlightCodeblocks = (content: string) => {
      const doc = new DOMParser().parseFromString(content, "text/html");
      doc.querySelectorAll("pre code").forEach((el) => {
        // @ts-ignore
        // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
        hljs.highlightElement(el);
      });
      return new XMLSerializer().serializeToString(doc);
    };