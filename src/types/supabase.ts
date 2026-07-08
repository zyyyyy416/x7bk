/**
 * Supabase Database 类型定义
 * 生成方式: npx supabase gen types typescript --linked > src/types/supabase.ts
 * 当前为手动编写的 MVP 版本
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          nickname: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          name: string;
          cover: string | null;
          type: 'personal' | 'shared';
          creator_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cover?: string | null;
          type?: 'personal' | 'shared';
          creator_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cover?: string | null;
          type?: 'personal' | 'shared';
          creator_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'books_creator_id_fkey';
            columns: ['creator_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      book_members: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_members_book_id_fkey';
            columns: ['book_id'];
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'book_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          parent_id: string | null;
          type: 'expense' | 'income';
          engel_eligible: boolean;
          sort_order: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon: string;
          parent_id?: string | null;
          type: 'expense' | 'income';
          engel_eligible?: boolean;
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          parent_id?: string | null;
          type?: 'expense' | 'income';
          engel_eligible?: boolean;
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      bills: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          category_id: string;
          amount: number;
          type: 'expense' | 'income';
          note: string | null;
          photo_url: string | null;
          bill_date: string;
          is_shared: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          category_id: string;
          amount: number;
          type?: 'expense' | 'income';
          note?: string | null;
          photo_url?: string | null;
          bill_date?: string;
          is_shared?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          type?: 'expense' | 'income';
          note?: string | null;
          photo_url?: string | null;
          bill_date?: string;
          is_shared?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bills_book_id_fkey';
            columns: ['book_id'];
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bills_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bills_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          category_id: string | null;
          amount: number;
          period: 'monthly';
          start_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          category_id?: string | null;
          amount: number;
          period?: 'monthly';
          start_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string | null;
          category_id?: string | null;
          amount?: number;
          period?: 'monthly';
          start_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budgets_book_id_fkey';
            columns: ['book_id'];
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budgets_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      settlements: {
        Row: {
          id: string;
          book_id: string;
          from_user_id: string;
          to_user_id: string;
          amount: number;
          status: 'pending' | 'settled';
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          from_user_id: string;
          to_user_id: string;
          amount: number;
          status?: 'pending' | 'settled';
          settled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          from_user_id?: string;
          to_user_id?: string;
          amount?: number;
          status?: 'pending' | 'settled';
          settled_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'settlements_book_id_fkey';
            columns: ['book_id'];
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'settlements_from_user_id_fkey';
            columns: ['from_user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'settlements_to_user_id_fkey';
            columns: ['to_user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
