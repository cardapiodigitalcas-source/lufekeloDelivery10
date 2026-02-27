/* ============================================================
   MAIN.JS - VERSÃO CORRIGIDA (SEM DUPLICAÇÃO)
   ============================================================ */

const ID_LOJA = window.ID_LOJA || "lufekelo"; 

window.storeConfig = {};
window.allProducts = []; 
let tempoEsperaBairro = null;

window.onload = async () => {
    renderSkeletons();

    // 1. ESCUTAR CONFIGURAÇÕES DA LOJA (Tempo Real)
    db.collection("lojas").doc(ID_LOJA).onSnapshot((doc) => {
        if (doc.exists) {
            window.storeConfig = doc.data();
            const config = window.storeConfig;

            const storeNameEl = document.getElementById("store-name");
            if (storeNameEl) storeNameEl.innerText = config.nome || config.nome_loja || "Minha Loja";
            if (config.logo) document.getElementById("logo").src = config.logo;

            if (config.cor_principal) document.documentElement.style.setProperty('--cor-principal', config.cor_principal);
            if (config.cor_secundaria) document.documentElement.style.setProperty('--cor-secundaria', config.cor_secundaria);

            iniciarCarrosselDinamico();
            verificarHorario();
            aplicarTravaPagamento();
            
            if (config.bairros && typeof Cart !== 'undefined') {
                Cart.bairrosData = config.bairros;
            }
        }
    });

    // 2. ESCUTAR PRODUTOS (Tempo Real)
    db.collection("lojas").doc(ID_LOJA).collection("produtos")
      .onSnapshot((snapshot) => {
          const produtosFirebase = [];
          snapshot.forEach(doc => {
              const p = doc.data();
              produtosFirebase.push({
                  id: doc.id,
                  nome: p.nome,
                  preco: p.preco,
                  categoria: p.categoria,
                  descricao: p.descricao,
                  imagem: p.imagem,
                  ativo: (p.disponivel === true || String(p.disponivel).toUpperCase() === "SIM") ? "SIM" : "NÃO"
              });
          });
          renderProducts(produtosFirebase);
      });

    atualizarSaudacao();
    carregarDadosSalvos();
    monitorarBairro(); 
};

// --- FUNÇÕES DE INTERFACE ---

function renderSkeletons() {
    const container = document.getElementById("products");
    if (!container) return;
    container.innerHTML = Array(4).fill(`
        <div class="product-card skeleton" style="margin-bottom: 15px; background: #fff; border-radius: 15px; padding: 15px; opacity: 0.7;">
            <div style="display:flex; gap:15px;">
                <div style="width:80px; height:80px; background:#eee; border-radius:10px;"></div>
                <div style="flex:1;">
                    <div style="width:60%; height:15px; background:#eee; margin-bottom:10px;"></div>
                    <div style="width:90%; height:10px; background:#eee;"></div>
                </div>
            </div>
        </div>`).join('');
}

function renderProducts(produtos) {
    const container = document.getElementById("products");
    const menuContainer = document.getElementById("category-menu");
    if (!container) return;

    const ativos = produtos.filter(p => p.ativo === "SIM");
    window.allProducts = ativos; 

    const categorias = ["Todos", ...new Set(ativos.map(p => p.categoria).filter(c => c))];
    
    if (menuContainer) {
        menuContainer.innerHTML = categorias.map(cat => `
            <button class="btn-category ${cat === 'Todos' ? 'active' : ''}" onclick="filtrarCategoria('${cat}')">${cat}</button>
        `).join('');
    }
    exibirProdutos(ativos);
}

function exibirProdutos(lista) {
    const container = document.getElementById("products");
    if (!container) return;
    
    // CORREÇÃO: Limpa o container antes de exibir para evitar duplicação
    container.innerHTML = ""; 
    
    if (lista.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Nenhum produto disponível.</p>";
        return;
    }

    container.innerHTML = lista.map(p => {
        const precoNum = parseFloat(String(p.preco || 0).replace(',', '.'));
        const produtoJson = JSON.stringify(p).replace(/'/g, "&apos;");
        return `
            <div class="product-card">
                <div class="product-card-top">
                    <img src="${p.imagem}" class="product-img" onerror="this.src='https://via.placeholder.com/100'">
                    <div class="product-info">
                        <h3>${p.nome}</h3>
                        <p>${p.descricao || ''}</p>
                    </div>
                </div>
                <div class="product-card-bottom">
                    <div class="product-price">R$ ${precoNum.toFixed(2).replace('.', ',')}</div>
                    <button onclick='Cart.add(${produtoJson})' class="btn-add">Comprar</button>
                </div>
            </div>`;
    }).join('');
}

// ... Restante das funções (filtrarCategoria, verificarHorario, etc) permanecem iguais ...
function filtrarCategoria(cat) {
    const filtrados = (cat === "Todos") ? window.allProducts : window.allProducts.filter(p => p.categoria === cat);
    exibirProdutos(filtrados);
    document.querySelectorAll('.btn-category').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === cat);
    });
}

function verificarHorario() {
    const config = window.storeConfig;
    const statusContainer = document.getElementById("loja-status-msg");
    const btnCart = document.getElementById("btn-finalizar-cart");
    if (!config || !config.abertura || !config.fechamento) return;

    const agora = new Date();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');
    const abertura = config.abertura.padStart(5, '0');
    const fechamento = config.fechamento.padStart(5, '0');

    let estaAberto = (fechamento > abertura) 
        ? (horaAtual >= abertura && horaAtual < fechamento) 
        : (horaAtual >= abertura || horaAtual < fechamento);

    if (statusContainer) {
        if (estaAberto) {
            statusContainer.innerHTML = "🟢 Aberto agora";
            statusContainer.className = "status-loja aberto"; 
            if (btnCart) { btnCart.disabled = false; btnCart.innerText = "Finalizar Pedido"; }
        } else {
            statusContainer.innerHTML = `🔴 Fechado - Abrimos às ${abertura}`;
            statusContainer.className = "status-loja fechado"; 
            if (btnCart) { btnCart.disabled = true; btnCart.innerText = "Loja Fechada"; }
        }
    }
}

function monitorarBairro() {
    const inputBairro = document.getElementById('cliente-bairro');
    if (!inputBairro) return;

    inputBairro.addEventListener('input', (e) => {
        clearTimeout(tempoEsperaBairro);
        tempoEsperaBairro = setTimeout(() => {
            if (typeof Cart !== 'undefined' && Cart.sugerirBairros) {
                Cart.sugerirBairros(e.target.value);
            }
        }, 300);
    });
}

function iniciarCarrosselDinamico() {
    const config = window.storeConfig;
    const bgElement = document.getElementById("header-bg");
    if (!bgElement || !config) return;

    const b1 = config.banner1 || config.Banner1 || "";
    const b2 = config.banner2 || config.Banner2 || "";
    const b3 = config.banner3 || config.Banner3 || "";

    const imagens = [b1, b2, b3].filter(url => url && url.length > 10); 

    if (imagens.length === 0) return;
    if (window.intervaloBanner) clearInterval(window.intervaloBanner);

    let index = 0;
    const trocarImagem = () => {
        bgElement.style.backgroundImage = `url("${imagens[index]}")`;
        index = (index + 1) % imagens.length;
    };
    trocarImagem();
    if (imagens.length > 1) window.intervaloBanner = setInterval(trocarImagem, 4000);
}

function aplicarTravaPagamento() {
    const config = window.storeConfig;
    const selectPagamento = document.getElementById('pagamento');
    if (!config || !selectPagamento) return;

    const aceitaOutros = config.aceita_dinheiro_cartao === "SIM" || config.aceita_dinheiro_cartao === true;
    
    let options = '<option value="Pix">Pix</option>';
    if (aceitaOutros) {
        options += `
            <option value="Cartão">Cartão (levar maquininha)</option>
            <option value="Dinheiro">Dinheiro</option>
        `;
    }
    selectPagamento.innerHTML = options;
}

function atualizarSaudacao() {
    const agora = new Date();
    const hora = agora.getHours();
    let saudacao = (hora >= 5 && hora < 12) ? "Bom dia" : (hora >= 12 && hora < 18) ? "Boa tarde" : "Boa noite";
    const displaySaudacao = document.getElementById('saudacao-usuario');
    if (displaySaudacao) displaySaudacao.innerText = `${saudacao}! 👋`;
}

function carregarDadosSalvos() {
    const salvos = localStorage.getItem('dados_cliente');
    if (salvos) {
        const dados = JSON.parse(salvos);
        if (document.getElementById('cliente-nome')) document.getElementById('cliente-nome').value = dados.nome || "";
        if (document.getElementById('cliente-bairro')) document.getElementById('cliente-bairro').value = dados.bairro || "";
    }
}