export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Tier = "bronze" | "silver" | "gold" | "vip";
export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export type TransactionStatus = "pending" | "success" | "failed";
export type WebhookEventStatus = "processing" | "done";
export type RefundStatus = "pending" | "succeeded" | "failed";

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
          is_handmade: boolean;
          colors: string[];
          sizes: string[];
          variant_stock: Record<string, number>;
          variant_price: Record<string, number>;
          shipping_weight_grams: number | null;
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
          colors?: string[];
          sizes?: string[];
          variant_stock?: Record<string, number>;
          variant_price?: Record<string, number>;
          featured?: boolean;
          is_handmade?: boolean;
          shipping_weight_grams?: number | null;
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
          colors?: string[];
          sizes?: string[];
          variant_stock?: Record<string, number>;
          variant_price?: Record<string, number>;
          featured?: boolean;
          is_handmade?: boolean;
          shipping_weight_grams?: number | null;
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
          shipped_at: string | null;
          delivered_at: string | null;
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
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: OrderStatus;
          delivery_address?: Json | null;
          notes?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
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
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
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
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
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
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
      };
      pending_stripe_orders: {
        Row: {
          payment_intent_id: string;
          user_id: string | null;
          items: Json;
          delivery_address: Json;
          total_amount: number;
          subtotal_amount: number | null;
          shipping_amount: number | null;
          currency: string;
          created_at: string;
          // Set when this row was resolved via the out-of-stock refund path
          // instead of a normal created order — kept (never deleted) so the
          // items jsonb remains the historical record of what was in the
          // cart. NULL means either still genuinely pending or resolved via
          // a normal order (those rows are deleted, not marked).
          resolved_at: string | null;
        };
        Insert: {
          payment_intent_id: string;
          user_id?: string | null;
          items: Json;
          delivery_address: Json;
          total_amount: number;
          subtotal_amount?: number | null;
          shipping_amount?: number | null;
          currency: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          resolved_at?: string | null;
        };
      };
      stripe_webhook_events: {
        Row: {
          event_id: string;
          created_at: string;
          // "processing" = mid-flight, a duplicate delivery should retry
          // later (409), not short-circuit. "done" = terminal (order
          // created OR refunded), a duplicate delivery short-circuits 200.
          status: WebhookEventStatus;
          // Bumped on every status transition; a "processing" row whose
          // updated_at is stale means the delivery that owned it died
          // mid-flight — see the route's takeover logic and the
          // stuck_webhook_events view.
          updated_at: string;
        };
        Insert: {
          event_id: string;
          created_at?: string;
          status?: WebhookEventStatus;
          updated_at?: string;
        };
        Update: {
          status?: WebhookEventStatus;
          updated_at?: string;
        };
      };
      refunds: {
        Row: {
          id: string;
          payment_intent_id: string;
          amount: number;
          currency: string;
          reason: string;
          product_name: string | null;
          customer_email: string | null;
          // "pending" is written BEFORE the Stripe refund call — an honest
          // "we attempted this" record, not a claim of success — so a
          // persistently-failing refund still leaves a durable, queryable
          // row instead of only an unread console.error.
          status: RefundStatus;
          stripe_refund_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_intent_id: string;
          amount: number;
          currency: string;
          reason: string;
          product_name?: string | null;
          customer_email?: string | null;
          status?: RefundStatus;
          stripe_refund_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: RefundStatus;
          stripe_refund_id?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
      };
      new_in_items: {
        Row: {
          id: string;
          name: string;
          product_image: string;
          lifestyle_image: string | null;
          sold_out: boolean;
          display_order: number;
          created_at: string;
          price: number;
          discount_price: number | null;
          colors: string[];
          sizes: string[];
          description: string | null;
          sku: string | null;
          stock_quantity: number;
          updated_at: string;
          variant_price: Record<string, number>;
          is_handmade: boolean;
          shipping_weight_grams: number | null;
          added_to_collections: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          product_image: string;
          lifestyle_image?: string | null;
          sold_out?: boolean;
          display_order?: number;
          created_at?: string;
          price: number;
          discount_price?: number | null;
          colors?: string[];
          sizes?: string[];
          description?: string | null;
          sku?: string | null;
          stock_quantity?: number;
          updated_at?: string;
          variant_price?: Record<string, number>;
          is_handmade?: boolean;
          shipping_weight_grams?: number | null;
          added_to_collections?: boolean;
        };
        Update: {
          name?: string;
          product_image?: string;
          lifestyle_image?: string | null;
          sold_out?: boolean;
          display_order?: number;
          price?: number;
          discount_price?: number | null;
          colors?: string[];
          sizes?: string[];
          description?: string | null;
          sku?: string | null;
          stock_quantity?: number;
          updated_at?: string;
          variant_price?: Record<string, number>;
          is_handmade?: boolean;
          shipping_weight_grams?: number | null;
          added_to_collections?: boolean;
        };
      };
      custom_products: {
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
          colors: string[];
          sizes: string[];
          variant_stock: Record<string, number>;
          variant_price: Record<string, number>;
          display_order: number;
          created_at: string;
          updated_at: string;
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
          colors?: string[];
          sizes?: string[];
          variant_stock?: Record<string, number>;
          variant_price?: Record<string, number>;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
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
          colors?: string[];
          sizes?: string[];
          variant_stock?: Record<string, number>;
          variant_price?: Record<string, number>;
          display_order?: number;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          screenshot: string;
          platform: "whatsapp" | "instagram";
          customer_label: string | null;
          location: string | null;
          review_date: string | null;
          rating: number | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          screenshot: string;
          platform: "whatsapp" | "instagram";
          customer_label?: string | null;
          location?: string | null;
          review_date?: string | null;
          rating?: number | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          screenshot?: string;
          platform?: "whatsapp" | "instagram";
          customer_label?: string | null;
          location?: string | null;
          review_date?: string | null;
          rating?: number | null;
          display_order?: number;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          image: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string;
          image?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          image?: string | null;
          display_order?: number;
        };
      };
    };
  };
}
