import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Listar todas as notas
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Erro ao buscar notas:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Erro no endpoint de notas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar nova nota
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();

    const { title, description, color, created_by } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Título e descrição são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        title,
        description,
        color: color || "yellow",
        created_by,
      })
      .select()
      .single();

    if (error) {
      logger.error("Erro ao criar nota:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.log("Nota criada:", data.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logger.error("Erro no endpoint de criação de nota:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
