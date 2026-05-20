export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Tier = "bronze" | "silver" | "gold" | "vip";
export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export type TransactionStatus = "pending" | "success" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          total_spent: number;
          coin_balance: number;
          tier: Tier;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          total_spent?: number;
          coin_balance?: number;
          tier?: Tier;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          total_spent?: number;
          coin_balance?: number;
          tier?: Tier;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          original_price: number | null;
          category: string;
          rating: number;
          review_count: number;
          image: string | null;
          images: string[];
          description: string | null;
          details: string[];
          tags: string[];
          stock_quantity: number;
          in_stock: boolean;
          featured: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          original_price?: number | null;
          category: string;
          rating?: number;
          review_count?: number;
          image?: string | null;
          images?: string[];
          description?: string | null;
          details?: string[];
          tags?: string[];
          stock_quantity?: number;
          featured?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          price?: number;
          original_price?: number | null;
          category?: string;
          rating?: number;
          review_count?: number;
          image?: string | null;
          images?: string[];
          description?: string | null;
          details?: string[];
          tags?: string[];
          stock_quantity?: number;
          featured?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: OrderStatus;
          total_amount: number;
          delivery_address: Json | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: OrderStatus;
          total_amount: number;
          delivery_address?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: OrderStatus;
          delivery_address?: Json | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_image: string | null;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          product_image?: string | null;
          quantity: number;
          unit_price: number;
        };
        Update: never;
      };
      transactions: {
        Row: {
          id: string;
          order_id: string | null;
          user_id: string | null;
          paystack_reference: string | null;
          amount: number;
          currency: string;
          status: TransactionStatus;
          payment_channel: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          user_id?: string | null;
          paystack_reference?: string | null;
          amount: number;
          currency?: string;
          status?: TransactionStatus;
          payment_channel?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: TransactionStatus;
          payment_channel?: string | null;
          paid_at?: string | null;
          paystack_reference?: string | null;
        };
      };
    };
  };
}
