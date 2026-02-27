/* =========================================
   CARRINHO ARAÚJO - VERSÃO MULTI-LOJA
   ========================================= */

const ID_LOJA_ATUAL = "lufekelo"; 

const Cart = {
    items: [],
    taxaEntrega: 0,
    bairrosData: [], 
    bairroConfirmado: false,
    enviadoAoWhats: false,

    add: function(product) {
        const precoNum = parseFloat(String(product.preco || 0).replace(',', '.'));
        const existingItem = this.items.find(item => item.nome === product.nome);
        
        if (existingItem) {
            existingItem.quantidade += 1;
        } else {
            this.items.push({
                nome: product.nome,
                preco: precoNum,
                quantidade: 1
            });
        }
        this.update();
        this.playAnimation();
    },

    changeQuantity: function(index, delta) {
        this.items[index].quantidade += delta;
        if (this.items[index].quantidade <= 0) {
            this.items.splice(index, 1);
        }
        this.update();
    },

    playAnimation: function() {
        const btn = document.querySelector(".cart-float");
        if (btn) {
            btn.classList.add("cart-bump");
            setTimeout(() => btn.classList.remove("cart-bump"), 300);
        }
    },

    update: function() {
        // Tenta buscar bairros do storeConfig global se ainda não tiver
        if (this.bairrosData.length === 0 && window.storeConfig && window.storeConfig.bairros) {
            this.bairrosData = window.storeConfig.bairros;
        }

        const subtotal = this.items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        const totalComTaxa = subtotal + this.taxaEntrega;
        const qtdTotal = this.items.reduce((sum, item) => sum + item.quantidade, 0);

        const totalFloat = document.getElementById("cart-total-float");
        const totalModal = document.getElementById("cart-total");
        const cartCount = document.getElementById("cart-count");
        
        if (totalFloat) totalFloat.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        if (totalModal) totalModal.innerHTML = `<strong>R$ ${totalComTaxa.toFixed(2).replace('.', ',')}</strong>`;
        if (cartCount) cartCount.innerText = qtdTotal;

        const floatBtn = document.querySelector(".cart-float");
        if (floatBtn) {
            if (qtdTotal > 0) floatBtn.classList.remove("hidden");
            else floatBtn.classList.add("hidden");
        }

        this.render();
    },

    render: function() {
        const container = document.getElementById("cart-items");
        const minOrderContainer = document.getElementById("min-order-info");
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = "<p style='text-align:center;padding:20px;'>Carrinho vazio.</p>";
            if (minOrderContainer) minOrderContainer.innerHTML = "";
            return;
        }

        container.innerHTML = this.items.map((item, index) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
                <div style="display:flex;flex-direction:column;">
                    <span style="font-weight:bold;">${item.nome}</span>
                    <span style="font-size:0.85rem;color:#666;">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <button onclick="Cart.changeQuantity(${index}, -1)" style="width:30px;height:30px;border-radius:50%;border:none;background:#f0f0f0;cursor:pointer;">-</button>
                    <span style="font-weight:bold;">${item.quantidade}</span>
                    <button onclick="Cart.changeQuantity(${index}, 1)" style="width:30px;height:30px;border-radius:50%;border:none;background:#25d366;color:white;cursor:pointer;">+</button>
                </div>
            </div>
        `).join('');

        const subtotal = this.items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        if (minOrderContainer) {
            if (subtotal < 10.00) {
                const falta = (10.00 - subtotal).toFixed(2).replace('.', ',');
                minOrderContainer.innerHTML = `
                    <div class="min-order-warning" style="background:#fff3e0; color:#e65100; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem; border:1px solid #ffe0b2; text-align:center;">
                        🛵 <strong>Pedido Mínimo: R$ 10,00</strong><br>
                        Faltam R$ ${falta} para completarmos sua entrega!
                    </div>`;
            } else {
                minOrderContainer.innerHTML = "";
            }
        }
    },

   ajustarPagamento: function(valor) {
        const areaPix = document.getElementById("area-pix");
        const areaTroco = document.getElementById("area-troco");
        const chaveElement = document.getElementById("chave-pix-valor");
        const favorecidoElement = document.getElementById("favorecido-pix");
        
        // 1. Reset visual seguro
        if (areaPix) {
            areaPix.style.display = "none";
            areaPix.classList.add("hidden");
        }
        if (areaTroco) {
            areaTroco.style.display = "none";
            areaTroco.classList.add("hidden");
        }

        // 2. Lógica para PIX
        if (valor === 'Pix') {
            if (areaPix) {
                areaPix.style.display = "block";
                areaPix.classList.remove("hidden");
                
                // Busca dinâmica dos dados da loja
                const config = window.storeConfig;
                if (config && config.chave_pix) {
                    if (chaveElement) chaveElement.innerText = config.chave_pix;
                    if (favorecidoElement) favorecidoElement.innerText = config.favorecido || "Araújo Assados";
                } else {
                    // Busca de emergência no Firebase se o config global falhar
                    const db = window.db || (typeof firebase !== 'undefined' ? firebase.firestore() : null);
                    if (db) {
                        db.collection("lojas").doc(ID_LOJA_ATUAL).get().then(doc => {
                            if (doc.exists) {
                                const d = doc.data();
                                if (chaveElement) chaveElement.innerText = d.chave_pix || "Chave não cadastrada";
                                if (favorecidoElement) favorecidoElement.innerText = d.favorecido || "Araújo Assados";
                                window.storeConfig = d; 
                            }
                        }).catch(e => console.error("Erro ao carregar Pix dinâmico:", e));
                    }
                }
            }
        } 
        // 3. Lógica para Dinheiro
        else if (valor === 'Dinheiro') {
            if (areaTroco) {
                areaTroco.style.display = "block";
                areaTroco.classList.remove("hidden");
            }
        }
    }, // Certifique-se de que esta vírgula existe se houver outra função abaixo

    sugerirBairros: function(valor) {
        const statusBairro = document.getElementById("taxa-status");
        if (!statusBairro || !valor) return;

        const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const valorLimpo = normalizar(valor);

        // BUSCA CORRIGIDA: Verifica tanto b.bairro quanto b.nome (caso venha diferente da planilha)
        const bairroEncontrado = this.bairrosData.find(b => {
            const nomeBairro = b.bairro || b.nome || "";
            return normalizar(nomeBairro) === valorLimpo;
        });

        if (bairroEncontrado) {
            this.taxaEntrega = parseFloat(String(bairroEncontrado.taxa).replace(',', '.'));
            this.bairroConfirmado = true;
            statusBairro.innerHTML = `<span style="color: #25d366;">✅ Taxa: R$ ${this.taxaEntrega.toFixed(2).replace('.', ',')}</span>`;
        } else {
            this.taxaEntrega = 0;
            this.bairroConfirmado = false;
            statusBairro.innerHTML = `<span style="color: #d9534f;">❌ Bairro não localizado.</span>`;
        }
        this.update();
    },

enviarPedido: function() {
    if (!this.bairroConfirmado) return alert("⚠️ Selecione um bairro válido!");
    const subtotal = this.items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    if (subtotal < 10.00) return alert("😊 O pedido mínimo é R$ 10,00.");

    // 1. Captura dos campos
    const nome = document.getElementById('cliente-nome').value;
    const rua = document.getElementById('cliente-endereco').value;
    const cep = document.getElementById('cliente-cep').value;
    const bairro = document.getElementById('cliente-bairro').value;
    const referencia = document.getElementById('cliente-referencia').value;
    const pagamento = document.getElementById('pagamento').value;
    const troco = document.getElementById('valor-troco') ? document.getElementById('valor-troco').value : "";
    const obs = document.getElementById('cliente-obs').value;

    if (!nome || !rua) return alert("Por favor, preencha seu nome e endereço.");

    const enderecoCompleto = `${rua}, ${bairro}, Castanhal - PA, CEP: ${cep}. Ref: ${referencia}`;

    // 2. FORMATO CORRETO PARA O BI E FILA
    const dadosPedido = {
        cliente: nome,
        endereco: enderecoCompleto,
        bairro: bairro,
        pagamento: pagamento,
        troco: troco,
        observacao: obs,
        itens: this.items,
        taxa_entrega: this.taxaEntrega, // Salva como número para o BI somar
        total: (subtotal + this.taxaEntrega), // Salva como número
        status: "pendente",
        // USAR O TIMESTAMP DO FIREBASE É O QUE RESOLVE O RELATÓRIO
        data_hora: firebase.firestore.FieldValue.serverTimestamp() 
    };

    const database = window.db || firebase.firestore();
    
    // 3. ID DA LOJA SINCRONIZADO COM SEU FIREBASE
    const idRealLoja = "lufekelo"; 

    database.collection("lojas").doc(idRealLoja).collection("pedidos").add(dadosPedido)
        .then(() => {
            console.log("✅ Pedido salvo no Painel!");
            this.dispararWhatsApp(nome, enderecoCompleto, bairro, pagamento, troco, obs, subtotal);
        })
        .catch((error) => {
            console.error("❌ Erro Firebase:", error);
            alert("Erro ao salvar no painel.");
        });
},
    dispararWhatsApp: function(nome, endereco, bairro, pagamento, troco, obs, subtotal) {
        const config = window.storeConfig || {};
        const foneLoja = "5591992875156"; // Seu número fixo para o teste
        
        let itensTexto = this.items.map(i => `• ${i.quantidade}x ${i.nome}`).join('\n');
        const totalGeral = (subtotal + this.taxaEntrega).toFixed(2).replace('.', ',');

        let msg = `🛒 *NOVO PEDIDO*\n`;
        msg += `👤 *CLIENTE:* ${nome}\n`;
        msg += `📍 *ENDEREÇO:* ${endereco}\n`;
        msg += `💳 *PAGAMENTO:* ${pagamento}${troco ? ' (Troco p/ ' + troco + ')' : ''}\n\n`;
        msg += `*ITENS:*\n${itensTexto}\n\n`;
        msg += `💰 *TOTAL: R$ ${totalGeral}*`;

        window.open(`https://api.whatsapp.com/send?phone=${foneLoja}&text=${encodeURIComponent(msg)}`, "_blank");
        
        // Exibe o modal de sucesso do seu index.html
        const modalSucesso = document.getElementById('modal-pix-lembrete');
        if (modalSucesso) modalSucesso.style.display = 'flex';
    },

       checkout: function() {
        const subtotal = this.items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        if (subtotal < 10.00) return alert("😊 O pedido mínimo é R$ 10,00.");
        document.getElementById("cart-modal").classList.add("hidden");
        document.getElementById("checkout-modal").classList.remove("hidden");
        this.ajustarPagamento(document.getElementById("pagamento").value);
    },

    toggle: function() {
        const modal = document.getElementById("cart-modal");
        if (modal) { modal.classList.toggle("hidden"); this.render(); }
    },

    closeCheckout: function() {
        document.getElementById("checkout-modal").classList.add("hidden");
    }
};

window.Cart = Cart;