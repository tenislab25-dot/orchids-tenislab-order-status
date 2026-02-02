import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// PATCH - Atualizar nota
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resolvedParams = await params;
    const noteId = resolvedParams.id;
    const body = await request.json();

    const { title, description, color } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    const { data, error } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar nota:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    }

    logger.log("Nota atualizada:", noteId);
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Erro no endpoint de atualização de nota:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Deletar nota
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resolvedParams = await params;
    const noteId = resolvedParams.id;

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      logger.error("Erro ao deletar nota:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.log("Nota deletada:", noteId);
    return NextResponse.json({ message: "Nota deletada com sucesso" });
  } catch (error: any) {
    logger.error("Erro no endpoint de deleção de nota:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
