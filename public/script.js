// Smooth scroll para links âncora
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Função para abrir WhatsApp
function abrirWhatsApp() {
    const numeroWhatsApp = '5511915172179'; // COLOQUE SEU NÚMERO AQUI (com DDI + DDD)
    const mensagem = encodeURIComponent('Olá! Gostaria de saber mais sobre os serviços da Royal');
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');
}

// Função para solicitar orçamento
function solicitarOrcamento() {
    const numeroWhatsApp = '5511915172179'; // COLOQUE SEU NÚMERO AQUI (com DDI + DDD)
    const mensagem = encodeURIComponent('Olá! Gostaria de solicitar um orçamento');
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');
}

// Event listeners para todos os botões
document.addEventListener('DOMContentLoaded', function () {
    // Botão "Fale Comigo" no header
    const btnNav = document.querySelector('.btn-nav');
    if (btnNav) {
        btnNav.addEventListener('click', abrirWhatsApp);
    }

    // Botões CTA principais
    const btnsPrimary = document.querySelectorAll('.btn-primary');
    btnsPrimary.forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent.includes('WhatsApp')) {
                abrirWhatsApp();
            } else {
                abrirWhatsApp(); // Todos os primários abrem WhatsApp
            }
        });
    });

    // Botões secundários
    const btnsSecondary = document.querySelectorAll('.btn-secondary');
    btnsSecondary.forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent.includes('Orçamento')) {
                solicitarOrcamento();
            } else if (this.textContent.includes('Portfolio') || this.textContent.includes('Ver Portfolio')) {
                document.querySelector('#portfolio').scrollIntoView({ behavior: 'smooth' });
            } else {
                abrirWhatsApp();
            }
        });
    });

    // Botões de modelo (Premium e Parceria)
    const btnsModel = document.querySelectorAll('.btn-model');
    btnsModel.forEach(btn => {
        btn.addEventListener('click', function () {
            const modelo = this.textContent.includes('Premium') ? 'Premium' : 'Parceria Estratégica';
            const numeroWhatsApp = '5511915172179'; // COLOQUE SEU NÚMERO AQUI
            const mensagem = encodeURIComponent(`Olá! Tenho interesse no modelo ${modelo}`);
            window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');
        });
    });

    // Animação suave ao rolar
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Aplicar animação aos cards
    document.querySelectorAll('.feature-card, .metric-card, .model-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });

    // Contador animado para os números de stats
    const animateCounter = (element, target, duration = 2000) => {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = formatNumber(target);
                clearInterval(timer);
            } else {
                element.textContent = formatNumber(Math.floor(current));
            }
        }, 16);
    };

    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toString();
    };

    // Observar stats e animar quando visível
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                const value = entry.target.textContent.trim();
                entry.target.classList.add('animated');

                // Extrair número do texto
                if (value.includes('+')) {
                    const num = parseInt(value.replace('+', ''));
                    if (!isNaN(num)) {
                        entry.target.textContent = '0+';
                        animateCounter(entry.target, num, 2000);
                        // Restaurar o +
                        setTimeout(() => {
                            entry.target.textContent = num + '+';
                        }, 2000);
                    }
                } else if (value.includes('%')) {
                    const num = parseInt(value.replace('%', ''));
                    if (!isNaN(num)) {
                        entry.target.textContent = '0%';
                        let current = 0;
                        const timer = setInterval(() => {
                            current += 1;
                            entry.target.textContent = current + '%';
                            if (current >= num) {
                                clearInterval(timer);
                            }
                        }, 20);
                    }
                }
            }
        });
    }, { threshold: 0.5 });

    // Aplicar observer aos números de stats
    document.querySelectorAll('.stat-number').forEach(stat => {
        statsObserver.observe(stat);
    });

    // Efeito de typing no título principal (opcional)
    const heroTitle = document.querySelector('h1');
    if (heroTitle && window.innerWidth > 768) {
        const originalHTML = heroTitle.innerHTML;
        heroTitle.style.opacity = '0';

        setTimeout(() => {
            heroTitle.style.opacity = '1';
            heroTitle.style.transition = 'opacity 0.5s ease-in';
        }, 300);
    }

    // Botão CTA de parceria na seção de startups
    const btnPartnershipCta = document.querySelector('.btn-partnership-cta');
    if (btnPartnershipCta) {
        btnPartnershipCta.addEventListener('click', function () {
            const numeroWhatsApp = '5511999999999'; // COLOQUE SEU NÚMERO AQUI
            const mensagem = encodeURIComponent('Olá! Tenho uma ideia de startup e gostaria de propor uma parceria estratégica 🚀');
            window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');
        });
    }

    // Header permanece consistente: removemos o escurecimento no scroll
});






// Efeito parallax suave no hero
window.addEventListener('scroll', function () {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');

    if (hero && window.innerWidth > 768) {
        hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        hero.style.opacity = Math.max(1 - scrolled / 600, 0.3);
    }
});

// Função para copiar código (se houver seções de código no futuro)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copiado com sucesso!');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

// Log de interações (pode ser conectado a analytics)
document.querySelectorAll('button, a').forEach(element => {
    element.addEventListener('click', function () {
        console.log('Elemento clicado:', this.textContent || this.getAttribute('href'));
    });
});

// Preload de imagens (se houver)
window.addEventListener('load', function () {
    console.log('Royal - Landing Page carregada com sucesso!');
});

// Detectar modo escuro do sistema (já está em dark, mas caso queira adicionar toggle)
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Função para scroll suave ao topo
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Adicionar botão de voltar ao topo (aparece após scroll)
const createBackToTopButton = () => {
    const button = document.createElement('button');
    button.className = 'back-to-top';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(90deg, #FF3366 0%, #9945FF 100%);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    const icon = document.createElement('img');
    icon.src = 'imagens/foguete.png';
    icon.alt = 'Voltar ao topo';
    icon.className = 'back-to-top-icon';
    button.appendChild(icon);

    button.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            button.style.opacity = '1';
            button.style.transform = 'scale(1)';
        } else {
            button.style.opacity = '0';
            button.style.transform = 'scale(0.8)';
        }
    });

    document.body.appendChild(button);
};

// Criar botão ao carregar página
document.addEventListener('DOMContentLoaded', createBackToTopButton);

// Easter egg: Console message
console.log('%cRoyal - Soluções Digitais', 'color: #81d45c; font-size: 20px; font-weight: bold;');
console.log('%cDesenvolvido com excelência', 'color: #FF3366; font-size: 14px;');
console.log('%cInteressado em contratar? Entre em contato!', 'color: #9945FF; font-size: 12px;');
