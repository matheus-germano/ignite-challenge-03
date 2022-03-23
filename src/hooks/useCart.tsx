import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // cart clone
      const tempCart = [...cart];
      // it verifies if the product is already in cart, then return de product if it is.
      const productAlreadyAdded = tempCart.find(product => product.id === productId);

      // get the stock of the product
      const stock = await api.get(`stock/${productId}`);
      // get the amount of the product in stock
      const stockAmount = stock.data.amount;

      const currentAmount = productAlreadyAdded ? productAlreadyAdded.amount : 0;
      const sumAmount = currentAmount + 1;

      if (sumAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyAdded) {
        productAlreadyAdded.amount = sumAmount;
        tempCart[tempCart.findIndex(product => product.id === productAlreadyAdded.id)] = productAlreadyAdded;
        setCart(tempCart);
      } else {
        const response = await api.get(`products/${productId}`);
        const productToAdd = {
          ...response.data,
          amount: 1
        };
        tempCart.push(productToAdd);
      }

      setCart(tempCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let tempCart = [...cart];
      tempCart = tempCart.filter(item => item.id !== productId);
      setCart(tempCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      // cart clone
      const tempCart = [...cart];
      // it verifies if the product is already in cart, then return de product if it is.
      const productToUpdate = tempCart.find(product => product.id === productId);

      // get the stock of the product
      const stock = await api.get(`stock/${productId}`);
      // get the amount of the product in stock
      const totalStockAmount = stock.data.amount;
      const currentStockAmount = totalStockAmount - amount;

      if (currentStockAmount < 0) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        if (productToUpdate) {
          productToUpdate.amount = amount;

          tempCart[tempCart.findIndex(product => product.id === productToUpdate.id)] = productToUpdate;
          setCart(tempCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));
        };
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
