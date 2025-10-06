import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight, Shield, Lock, CreditCard, Package, Plus, Trash2, Save, ArrowLeft, Filter } from 'lucide-react';
import { supabase, Product } from './lib/supabase';
import { productCache } from './lib/productCache';

interface CartState {
  [sku: string]: number;
}

interface ShippingQuote {
  valorpac: string;
  prazopac: string;
  valorsedex: string;
  prazosedex: string;
}

const BANNER_IMAGES = [
  { id: 1, title: 'Novos Produtos', bg: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)' },
  { id: 2, title: 'Queima de Estoque', bg: 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)' },
  { id: 3, title: 'Frete Grátis', bg: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)' },
];

const CATEGORIES = [
  { id: 'dichavador', label: 'Dichavadores', icon: '⚙️' },
  { id: 'bong', label: 'Bongs', icon: '💨' },
  { id: 'seda', label: 'Sedas', icon: '📄' },
  { id: 'vaporizador', label: 'Vaporizadores', icon: '🔥' },
];

const FREE_SHIPPING_THRESHOLD = 130;
const ORIGIN_CEP = '01001000';
const ADMIN_PASSWORD = 'admin123';

function App() {
  const isAdminRoute = window.location.pathname === '/admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartState>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [feedback, setFeedback] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<'pac' | 'sedex' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    title: '',
    price: '',
    description: '',
    image_url: '',
    stock: '',
    active: true,
    category: '',
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isManagingStock, setIsManagingStock] = useState(false);
  const [stockForm, setStockForm] = useState({ id: '', sku: '', currentStock: 0, newStock: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdminRoute) {
        const data = await productCache.getAdminProducts();
        setProducts(data);
        setFilteredProducts(data);
      } else {
        const data = await productCache.getProducts();
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdminRoute]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p =>
        p.category && selectedCategories.includes(p.category)
      );
      setFilteredProducts(filtered);
    }
  }, [selectedCategories, products]);

  useEffect(() => {
    if (selectedProduct) {
      const related = products.filter(p => p.id !== selectedProduct.id).slice(0, 6);
      setRelatedProducts(related);
      setCarouselIndex(0);
    }
  }, [selectedProduct, products]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(c => c !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      alert('Senha incorreta!');
      setPasswordInput('');
    }
  };

  const addToCart = (sku: string) => {
    const product = productCache.getProductBySku(sku) || products.find(p => p.sku === sku);
    if (!product) return;

    const currentQty = cart[sku] || 0;
    if (currentQty >= product.stock) {
      showFeedback(`Estoque insuficiente para ${sku}`);
      return;
    }

    setCart(prev => ({
      ...prev,
      [sku]: (prev[sku] || 0) + 1
    }));
    showFeedback(`${sku} adicionado ao carrinho`);
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[sku] > 1) {
        newCart[sku]--;
      } else {
        delete newCart[sku];
      }
      return newCart;
    });
  };

  const removeItem = (sku: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[sku];
      return newCart;
    });
  };

  const clearCart = () => {
    if (Object.keys(cart).length === 0) return;
    setCart({});
    showFeedback('Carrinho limpo');
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 2000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => prev - 1);
  };

  useEffect(() => {
    if (currentSlide === BANNER_IMAGES.length || currentSlide === -1) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentSlide(currentSlide === BANNER_IMAGES.length ? 0 : BANNER_IMAGES.length - 1);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setIsTransitioning(false);
    }
  }, [currentSlide]);

  const calculateWeight = () => {
    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    return totalItems * 350;
  };

  const fetchShippingQuote = async () => {
    if (cep.length !== 8) {
      alert('Por favor insira um CEP válido com 8 dígitos');
      return;
    }

    setLoadingShipping(true);
    try {
      const weight = calculateWeight();
      const response = await fetch(
        `https://www.cepcerto.com/ws/json-frete/${ORIGIN_CEP}/${cep}/${weight}/20/20/20/teste`
      );
      const data = await response.json();
      setShippingQuote(data);
      setSelectedShipping(null);
    } catch (error) {
      alert('Erro ao calcular frete. Tente novamente.');
      console.error(error);
    } finally {
      setLoadingShipping(false);
    }
  };

  const calcTotals = () => {
    let subtotal = 0;
    for (const sku in cart) {
      const product = productCache.getProductBySku(sku) || products.find(p => p.sku === sku);
      if (product) {
        subtotal += product.price * cart[sku];
      }
    }

    let shipping = 0;
    if (selectedShipping && shippingQuote) {
      const originalShipping = parseFloat(
        selectedShipping === 'pac' ? shippingQuote.valorpac : shippingQuote.valorsedex
      );
      shipping = Math.max(15, originalShipping - 4);
      if (selectedShipping === 'sedex') {
        shipping = Math.max(28, originalShipping - 4);
      }
    } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      shipping = 0;
    }

    const taxes = 0.00;
    const total = subtotal + shipping + taxes;
    return { subtotal, taxes, total, shipping };
  };

  const handleCheckout = () => {
    if (Object.keys(cart).length === 0) {
      alert('Seu carrinho está vazio');
      return;
    }

    if (!email.trim()) {
      alert('Por favor insira o e-mail');
      return;
    }

    if (!cep.trim() || cep.length !== 8) {
      alert('Por favor insira um CEP válido');
      return;
    }

    if (!selectedShipping && !shippingQuote) {
      alert('Por favor calcule o frete');
      return;
    }

    const totals = calcTotals();
    const shippingMethod = selectedShipping === 'pac' ? 'PAC' : selectedShipping === 'sedex' ? 'SEDEX' : 'Padrão';
    console.log('Order:', { cart, email, cep, shippingMethod, ...totals });
    alert(`Pedido enviado com sucesso!\n\nTotal: R$${totals.total.toFixed(2)}\nEmail: ${email}\nFrete: ${shippingMethod}`);

    clearCart();
    setEmail('');
    setCep('');
    setShippingQuote(null);
    setSelectedShipping(null);
    setIsCartOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      sku: '',
      title: '',
      price: '',
      description: '',
      image_url: '',
      stock: '',
      active: true,
      category: '',
    });
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      title: product.title,
      price: product.price.toString(),
      description: product.description,
      image_url: product.image_url,
      stock: product.stock.toString(),
      active: product.active,
      category: product.category || '',
    });
  };

  const handleSave = async () => {
    if (!formData.sku || !formData.title || !formData.price) {
      alert('Preencha os campos obrigatórios: SKU, Título e Preço');
      return;
    }

    const productData = {
      sku: formData.sku,
      title: formData.title,
      price: parseFloat(formData.price),
      description: formData.description,
      image_url: formData.image_url,
      stock: parseInt(formData.stock) || 0,
      active: formData.active,
      category: formData.category || null,
    };

    if (isAdding) {
      const { data, error } = await supabase.from('produtos').insert([productData]).select().single();
      if (error) {
        console.error('Error adding product:', error);
        alert('Erro ao adicionar produto: ' + error.message);
        return;
      }
      if (data) {
        productCache.updateLocalProduct(data);
      }
      alert('Produto adicionado com sucesso!');
    } else if (editingId) {
      const { data, error } = await supabase
        .from('produtos')
        .update(productData)
        .eq('id', editingId)
        .select()
        .single();
      if (error) {
        console.error('Error updating product:', error);
        alert('Erro ao atualizar produto');
        return;
      }
      if (data) {
        productCache.updateLocalProduct(data);
      }
      alert('Produto atualizado com sucesso!');
    }

    setIsAdding(false);
    setEditingId(null);
    productCache.invalidateCache();
    loadProducts();
  };

  const handleDelete = async (id: string, sku: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto ${sku}?`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      alert('Erro ao excluir produto');
      return;
    }
    productCache.removeLocalProduct(id);
    alert('Produto excluído com sucesso!');
    loadProducts();
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const openStockManager = (product: Product) => {
    setStockForm({
      id: product.id,
      sku: product.sku,
      currentStock: product.stock,
      newStock: product.stock.toString()
    });
    setIsManagingStock(false);
  };

  const handleStockUpdate = async () => {
    const newStockValue = parseInt(stockForm.newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
      alert('Informe um valor válido para o estoque (maior ou igual a 0)');
      return;
    }

    const { data, error } = await supabase
      .from('produtos')
      .update({ stock: newStockValue })
      .eq('id', stockForm.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stock:', error);
      alert('Erro ao atualizar estoque');
      return;
    }

    if (data) {
      productCache.updateLocalProduct(data);
    }

    alert(`Estoque do produto ${stockForm.sku} atualizado para ${newStockValue} unidades!`);
    setStockForm({ id: '', sku: '', currentStock: 0, newStock: '' });
    productCache.invalidateCache();
    loadProducts();
  };

  const closeStockManager = () => {
    setIsManagingStock(false);
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  const nextCarousel = () => {
    if (carouselIndex < relatedProducts.length - 3) {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const prevCarousel = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    }
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totals = calcTotals();

  if (isAdminRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <h1 className="text-2xl font-bold tracking-wide mb-2">ÁREA ADMINISTRATIVA</h1>
            <p className="text-sm text-gray-600">Insira a senha para acessar</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Senha"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
            />
            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
            >
              ENTRAR
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-3 bg-gray-200 text-black rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              VOLTAR PARA LOJA
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-mono">
      <div className="bg-white border-b border-gray-200 py-2 px-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-2 text-xs font-medium tracking-wide text-gray-700">
          <Lock className="w-3.5 h-3.5" />
          <span>COMPRA 100% SEGURA</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 bg-white shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between px-6 py-5 max-w-[1400px] mx-auto">
          {selectedProduct ? (
            <button
              onClick={closeProductDetail}
              className="p-2 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-bold">VOLTAR</span>
            </button>
          ) : (
            <div className="text-xl font-bold tracking-[3px] text-gray-900">HEADSHOP</div>
          )}

          <div className="relative">
            <button
              onClick={toggleCart}
              className="p-2 hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            {cartCount > 0 && (
              <div className="absolute -right-1.5 -top-1.5 bg-black text-white rounded-full px-2 py-0.5 text-xs min-w-[20px] text-center animate-[popIn_0.3s_cubic-bezier(0.68,-0.55,0.265,1.55)] font-semibold">
                {cartCount}
              </div>
            )}
          </div>
        </div>

        {!selectedProduct && !isAdminRoute && (
          <div className="border-t border-gray-200">
            <div className="max-w-[1400px] mx-auto px-6 py-3">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                  <Filter className="w-4 h-4" />
                  <span>CATEGORIAS:</span>
                </div>
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategories.includes(category.id)
                        ? 'bg-black text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                ))}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all whitespace-nowrap"
                  >
                    ✕ LIMPAR FILTROS
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {!selectedProduct && !isAdminRoute && (
        <>
          <div className="relative w-full h-[280px] overflow-hidden bg-gray-100 group">
            <div
              className="flex h-full"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
                transition: isTransitioning ? 'transform 500ms ease-out' : 'none',
              }}
            >
              {[...BANNER_IMAGES, BANNER_IMAGES[0]].map((banner, index) => (
                <div
                  key={`${banner.id}-${index}`}
                  className="min-w-full h-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{ background: banner.bg }}
                >
                  {banner.title}
                </div>
              ))}
            </div>

            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5">
              {BANNER_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true);
                    setCurrentSlide(index);
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === (currentSlide % BANNER_IMAGES.length) ? 'bg-white w-8' : 'bg-white/50 w-2.5 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border-y border-gray-200 py-6">
            <div className="max-w-[750px] mx-auto px-6">
              <div className="grid grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2.5 group-hover:bg-gray-100 transition-colors">
                    <Shield className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">COMPRA SEGURA</div>
                  <div className="text-[11px] text-gray-600">Seus dados protegidos</div>
                </div>

                <div className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2.5 group-hover:bg-gray-100 transition-colors">
                    <Package className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">FRETE GRÁTIS</div>
                  <div className="text-[11px] text-gray-600">Acima de R$ 130</div>
                </div>

                <div className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2.5 group-hover:bg-gray-100 transition-colors">
                    <CreditCard className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="font-semibold text-xs text-gray-900 mb-0.5">PARCELE SEM JUROS</div>
                  <div className="text-[11px] text-gray-600">Em até 12x no cartão</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="py-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          {selectedProduct ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="grid md:grid-cols-2 gap-6 p-6">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                    {selectedProduct.image_url ? (
                      <img
                        src={selectedProduct.image_url}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-3/4 h-3/4"
                        viewBox="0 0 100 70"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="100" height="70" rx="4" fill="#d1d5db"/>
                        <text x="50" y="42" fontSize="16" textAnchor="middle" fill="#6b7280" fontWeight="600">{selectedProduct.sku}</text>
                      </svg>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500 font-medium">
                          {selectedProduct.sku}
                        </div>
                        {selectedProduct.category && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                            {CATEGORIES.find(c => c.id === selectedProduct.category)?.label || selectedProduct.category}
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {selectedProduct.title}
                      </h1>
                      <div className="text-3xl font-bold text-gray-900">
                        R$ {selectedProduct.price.toFixed(2)}
                      </div>

                      {selectedProduct.description && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Descrição</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {selectedProduct.description}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-bold text-xs">
                          {selectedProduct.stock > 0 ? `${selectedProduct.stock} em estoque` : 'Fora de estoque'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(selectedProduct.sku);
                        closeProductDetail();
                      }}
                      disabled={selectedProduct.stock === 0}
                      className="w-full px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      ADICIONAR AO CARRINHO
                    </button>
                  </div>
                </div>
              </div>

              {relatedProducts.length > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                      Você também pode gostar
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={prevCarousel}
                        disabled={carouselIndex === 0}
                        className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-black"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextCarousel}
                        disabled={carouselIndex >= relatedProducts.length - 3}
                        className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-black"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative overflow-hidden">
                    <div
                      className="flex gap-4 transition-transform duration-500 ease-out"
                      style={{ transform: `translateX(-${carouselIndex * (100 / 3)}%)` }}
                    >
                      {relatedProducts.map(product => (
                        <div
                          key={product.id}
                          className="min-w-[calc(33.333%-11px)] bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100"
                          onClick={() => openProductDetail(product)}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg
                                className="w-3/4 h-3/4 transform group-hover:scale-110 transition-transform duration-500"
                                viewBox="0 0 100 70"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect width="100" height="70" rx="4" fill="#d1d5db" className="group-hover:fill-[#b8bdc5] transition-all duration-300"/>
                                <text x="50" y="42" fontSize="16" textAnchor="middle" fill="#6b7280" fontWeight="600">{product.sku}</text>
                              </svg>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                              <div className="inline-block bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                Ver produto
                              </div>
                            </div>
                          </div>

                          <div className="p-3 space-y-1">
                            <div className="text-xs text-gray-500 font-medium">
                              {product.sku}
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 group-hover:text-black transition-colors line-clamp-2 min-h-[2.5rem]">
                              {product.title}
                            </h3>
                            <div className="text-base font-bold text-gray-900 pt-1">
                              R$ {product.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-xl mb-2">Carregando produtos...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-xl mb-2">
                {selectedCategories.length > 0 ? 'Nenhum produto encontrado nesta categoria' : 'Estamos sem estoque :('}
              </div>
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="mt-4 px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
                >
                  VER TODOS OS PRODUTOS
                </button>
              )}
            </div>
          ) : isAdminRoute && isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="text-sm text-gray-600">Total: {products.length} produtos</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsManagingStock(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
                  >
                    <Package className="w-4 h-4" />
                    GERENCIAR ESTOQUE
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    ADICIONAR PRODUTO
                  </button>
                </div>
              </div>

              {(isAdding || editingId) && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-lg mb-4">
                    {isAdding ? 'NOVO PRODUTO' : 'EDITAR PRODUTO'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">SKU *</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="TS-01"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">PREÇO (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="45.00"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-2">TÍTULO *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="Nome do produto"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-2">CATEGORIA</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Selecione uma categoria</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-2">DESCRIÇÃO</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="Descrição do produto"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">URL DA IMAGEM</label>
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">ESTOQUE</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="10"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-xs font-bold text-gray-700">PRODUTO ATIVO</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      SALVAR
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2 bg-gray-300 text-black rounded-lg font-bold text-sm hover:bg-gray-400 transition-all"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded">
                            {product.sku}
                          </span>
                          {!product.active && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                              INATIVO
                            </span>
                          )}
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                            Estoque: {product.stock}
                          </span>
                          {product.category && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                              {CATEGORIES.find(c => c.id === product.category)?.label || product.category}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{product.title}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        )}
                        <div className="text-lg font-bold text-gray-900">R$ {product.price.toFixed(2)}</div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Editar"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.sku)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => openProductDetail(product)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-3/4 h-3/4 transform group-hover:scale-110 transition-transform duration-500"
                        viewBox="0 0 100 70"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="100" height="70" rx="4" fill="#d1d5db" className="group-hover:fill-[#b8bdc5] transition-all duration-300"/>
                        <text x="50" y="42" fontSize="16" textAnchor="middle" fill="#6b7280" fontWeight="600">{product.sku}</text>
                      </svg>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
                        Ver detalhes
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 space-y-1">
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                      {product.sku}
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-black transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[2.8rem]">
                      {product.title}
                    </h3>
                    <div className="text-sm sm:text-base font-bold text-gray-900 pt-0.5">
                      R$ {product.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {isCartOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-[fadeIn_0.25s_ease-out] backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-[420px] max-w-[95%] bg-white shadow-[-6px_0_30px_rgba(0,0,0,0.2)] z-50 flex flex-col animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <strong className="text-lg tracking-wide">RESUMO DO PEDIDO</strong>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:scale-110 active:scale-95 transition-transform hover:bg-gray-200 rounded-full"
              >
                ✕
              </button>
            </div>

            {Object.keys(cart).length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center py-10 text-gray-400 px-6">
                <div>
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <div className="text-sm">SEU CARRINHO ESTÁ VAZIO</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {Object.keys(cart).map(sku => {
                    const product = productCache.getProductBySku(sku) || products.find(p => p.sku === sku);
                    if (!product) return null;
                    const qty = cart[sku];

                    return (
                      <div key={sku} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-20 h-20 bg-white flex items-center justify-center rounded-lg shadow-sm flex-shrink-0 border border-gray-200">
                          <span className="text-xs font-bold text-gray-600">{sku}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 mb-1">{sku}</div>
                          <div className="text-xs text-gray-600 mb-2">R${product.price.toFixed(2)} cada</div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => removeFromCart(sku)}
                              className="w-7 h-7 bg-white hover:bg-gray-200 rounded-lg font-bold transition-all hover:scale-110 shadow-sm border border-gray-200"
                            >
                              −
                            </button>
                            <span className="min-w-[36px] text-center text-sm font-bold">{qty}</span>
                            <button
                              onClick={() => addToCart(sku)}
                              className="w-7 h-7 bg-white hover:bg-gray-200 rounded-lg font-bold transition-all hover:scale-110 shadow-sm border border-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-gray-900 mb-2">R${(product.price * qty).toFixed(2)}</div>
                          <button
                            onClick={() => removeItem(sku)}
                            className="text-sm hover:scale-125 transition-transform opacity-60 hover:opacity-100"
                            title="Remover item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 border-t-2 border-gray-200 bg-gray-50 space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-green-800">
                        {totals.subtotal >= FREE_SHIPPING_THRESHOLD
                          ? '✓ FRETE GRÁTIS GARANTIDO!'
                          : `Falta R$${(FREE_SHIPPING_THRESHOLD - totals.subtotal).toFixed(2)} para frete grátis`}
                      </span>
                      <span className="text-gray-600 font-semibold">R${totals.subtotal.toFixed(2)} / R${FREE_SHIPPING_THRESHOLD.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${
                          totals.subtotal >= FREE_SHIPPING_THRESHOLD ? 'bg-green-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min((totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="text-gray-600">SUBTOTAL</div>
                      <div className="font-semibold">R${totals.subtotal.toFixed(2)}</div>
                    </div>
                    {(selectedShipping && shippingQuote) || totals.subtotal >= FREE_SHIPPING_THRESHOLD ? (
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-600">FRETE</div>
                        <div className={totals.shipping === 0 ? 'text-green-600 font-bold' : 'font-semibold'}>
                          {totals.shipping === 0 ? 'GRÁTIS' : `R$${totals.shipping.toFixed(2)}`}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm">
                      <div className="text-gray-600 flex items-center gap-2">
                        <span>IMPOSTOS</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-700 font-bold">EXTERIOR</span>
                      </div>
                      <div className="font-semibold">R${totals.taxes.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-gray-300 text-lg">
                      <div className="font-bold">TOTAL</div>
                      <div className="font-bold">R${totals.total.toFixed(2)}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-bold text-gray-700 uppercase tracking-wide">CEP de Entrega</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="00000000"
                        maxLength={8}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all text-sm"
                      />
                      <button
                        onClick={fetchShippingQuote}
                        disabled={loadingShipping}
                        className="px-5 py-3 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                      >
                        {loadingShipping ? 'CALC...' : 'CALCULAR'}
                      </button>
                    </div>
                  </div>

                  {shippingQuote && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Opções de Frete</label>
                      <button
                        onClick={() => setSelectedShipping('pac')}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedShipping === 'pac'
                            ? 'border-black bg-gray-100 shadow-md'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold">PAC</div>
                            <div className="text-xs text-gray-600">{shippingQuote.prazopac} dias úteis</div>
                          </div>
                          <div className="font-bold text-lg">
                            R$ {Math.max(15, parseFloat(shippingQuote.valorpac) - 4).toFixed(2)}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedShipping('sedex')}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedShipping === 'sedex'
                            ? 'border-black bg-gray-100 shadow-md'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold">SEDEX</div>
                            <div className="text-xs text-gray-600">{shippingQuote.prazosedex} dias úteis</div>
                          </div>
                          <div className="font-bold text-lg">
                            R$ {Math.max(28, parseFloat(shippingQuote.valorsedex) - 4).toFixed(2)}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block mb-2 text-xs font-bold text-gray-700 uppercase tracking-wide">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all text-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCheckout}
                      className="flex-1 px-4 py-4 rounded-lg bg-black text-white font-bold text-sm hover:bg-gray-800 hover:shadow-xl transition-all uppercase tracking-wide"
                    >
                      FINALIZAR PEDIDO
                    </button>
                    <button
                      onClick={clearCart}
                      className="px-4 py-4 rounded-lg bg-gray-200 text-black font-bold text-sm hover:bg-gray-300 transition-all uppercase tracking-wide"
                    >
                      LIMPAR
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-xl text-sm z-[1000] animate-[slideUp_0.3s_ease] shadow-2xl font-semibold">
          {feedback}
        </div>
      )}

      {isManagingStock && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-[fadeIn_0.25s_ease-out] backdrop-blur-sm"
            onClick={closeStockManager}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col animate-[slideUp_0.3s_ease]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <strong className="text-xl tracking-wide block">GERENCIAR ESTOQUE</strong>
                  <p className="text-sm text-gray-600">Atualize a quantidade de produtos disponíveis</p>
                </div>
              </div>
              <button
                onClick={closeStockManager}
                className="p-2 hover:scale-110 active:scale-95 transition-transform hover:bg-gray-200 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded">
                            {product.sku}
                          </span>
                          {!product.active && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                              INATIVO
                            </span>
                          )}
                          <span className={`px-3 py-1 text-xs font-bold rounded ${
                            product.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : product.stock <= 5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {product.stock === 0 ? 'SEM ESTOQUE' : `${product.stock} unidades`}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{product.title}</h3>
                        <div className="text-sm text-gray-600 mt-1">R$ {product.price.toFixed(2)}</div>
                      </div>

                      <button
                        onClick={() => openStockManager(product)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                      >
                        AJUSTAR ESTOQUE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeStockManager}
                className="w-full px-4 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </>
      )}

      {stockForm.id && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-[fadeIn_0.25s_ease-out] backdrop-blur-sm"
            onClick={() => setStockForm({ id: '', sku: '', currentStock: 0, newStock: '' })}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl z-[60] animate-[slideUp_0.3s_ease]">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="text-xl font-bold mb-1">Ajustar Estoque</h3>
              <p className="text-sm text-gray-600">Produto: {stockForm.sku}</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Estoque Atual</div>
                <div className="text-3xl font-bold text-gray-900">{stockForm.currentStock} unidades</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">NOVO ESTOQUE *</label>
                <input
                  type="number"
                  min="0"
                  value={stockForm.newStock}
                  onChange={(e) => setStockForm({ ...stockForm, newStock: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-semibold"
                  placeholder="0"
                  autoFocus
                />
              </div>

              {stockForm.newStock && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Diferença</div>
                  <div className={`text-2xl font-bold ${
                    parseInt(stockForm.newStock) > stockForm.currentStock
                      ? 'text-green-600'
                      : parseInt(stockForm.newStock) < stockForm.currentStock
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {parseInt(stockForm.newStock) > stockForm.currentStock && '+'}
                    {parseInt(stockForm.newStock) - stockForm.currentStock} unidades
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => setStockForm({ id: '', sku: '', currentStock: 0, newStock: '' })}
                className="flex-1 px-4 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleStockUpdate}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all hover:shadow-lg"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </>
      )}

      {!isAdminRoute && (
        <footer className="bg-white border-t border-gray-200 py-12 px-6 mt-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-gray-50 rounded-xl p-8 mb-10 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1 text-gray-900">PAGAMENTO SEGURO</div>
                    <div className="text-xs text-gray-600 leading-relaxed">Certificado SSL e criptografia de dados em todas as transações</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1 text-gray-900">PRIVACIDADE GARANTIDA</div>
                    <div className="text-xs text-gray-600 leading-relaxed">Seus dados pessoais são protegidos conforme a LGPD</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1 text-gray-900">COMPRA GARANTIDA</div>
                    <div className="text-xs text-gray-600 leading-relaxed">7 dias para troca ou devolução sem complicações</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-lg mb-4 tracking-wide text-gray-900">HEADSHOP</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Sua loja de confiança para produtos de qualidade premium.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 tracking-wide text-gray-900">ATENDIMENTO</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Segunda a Sexta: 9h às 18h</li>
                  <li>Sábado: 9h às 14h</li>
                  <li>contato@headshop.com</li>
                  <li>(11) 9999-9999</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 tracking-wide text-gray-900">INSTITUCIONAL</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="hover:text-gray-900 transition-colors cursor-pointer">Sobre Nós</li>
                  <li className="hover:text-gray-900 transition-colors cursor-pointer">Política de Privacidade</li>
                  <li className="hover:text-gray-900 transition-colors cursor-pointer">Termos de Uso</li>
                  <li className="hover:text-gray-900 transition-colors cursor-pointer">Trocas e Devoluções</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-4 tracking-wide text-gray-900">PAGAMENTO SEGURO</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="bg-gray-900 px-3 py-2 rounded text-white font-bold text-xs">VISA</div>
                  <div className="bg-gray-900 px-3 py-2 rounded text-white font-bold text-xs">MASTER</div>
                  <div className="bg-gray-900 px-3 py-2 rounded text-white font-bold text-xs">PIX</div>
                  <div className="bg-gray-900 px-3 py-2 rounded text-white font-bold text-xs">BOLETO</div>
                </div>
                <p className="text-gray-600 text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Ambiente 100% seguro
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-600 text-sm">
                © 2024 HEADSHOP. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>CNPJ: 00.000.000/0001-00</span>
                <span className="hidden md:inline">|</span>
                <span>Certificado SSL</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes slideIn {
          from { transform: translateX(110%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default App;
