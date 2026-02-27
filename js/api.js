const API = {
    url: "https://script.google.com/macros/s/AKfycbx5MhI08sTrr0-RtYLCyXKB96w47OkI_augYc5heSrQU9StSmOBDFbMwSn7Swgo0e0Fow/exec", 

    async load() {
        try {
            const response = await fetch(this.url);
            const data = await response.json();
            window.storeConfig = data.config; 
            window.bairrosCadastrados = data.bairros; // Salva a lista de bairros da planilha
            return data;
        } catch (error) {
            console.error("Erro ao carregar API:", error);
            return { produtos: [], config: {}, bairros: [] };
        }
    }
};