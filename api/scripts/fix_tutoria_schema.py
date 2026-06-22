from pathlib import Path

SCHEMA_PATH = Path('api/prisma/schema.prisma')

RELATIONS = {
    'Usuario': [
        '  comentarios_bimestrales_registrados ComentarioBimestral[] @relation("UsuarioComentariosBimestrales")',
        '  calificaciones_tutoria              CalificacionTutoria[] @relation("UsuarioCalificacionesTutoria")',
    ],
    'Tenant': [
        '  criterios_tutoria CriterioTutoria[]',
    ],
    'Colegio': [
        '  criterios_tutoria   CriterioTutoria[]',
    ],
    'Matricula': [
        '  calificaciones_tutoria CalificacionTutoria[]',
    ],
    'Bimestre': [
        '  calificaciones_tutoria CalificacionTutoria[]',
    ],
}

COMENTARIO_BIMESTRAL_MODEL = '''model ComentarioBimestral {
  id_comentario       Int      @id @default(autoincrement())
  id_matricula        Int
  id_bimestre         Int
  id_docente          Int?
  id_usuario_registro Int?
  comentario          String   @db.Text
  creado_en           DateTime @default(now())
  updated_at          DateTime @updatedAt

  matricula        Matricula @relation(fields: [id_matricula], references: [id_matricula])
  bimestre         Bimestre  @relation(fields: [id_bimestre], references: [id_bimestre])
  docente          Docente?  @relation(fields: [id_docente], references: [id_persona])
  usuario_registro Usuario?  @relation("UsuarioComentariosBimestrales", fields: [id_usuario_registro], references: [id_usuario], onDelete: SetNull)

  @@unique([id_matricula, id_bimestre])
  @@index([id_bimestre])
  @@index([id_docente])
  @@index([id_usuario_registro])
}
'''

TUTORIA_MODELS = '''
model CriterioTutoria {
  id_criterio Int      @id @default(autoincrement())
  id_tenant   Int?
  id_colegio  Int?
  tipo        String   @db.VarChar(40)
  descripcion String   @db.VarChar(250)
  orden       Int      @default(1)
  activo      Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant  Tenant?  @relation(fields: [id_tenant], references: [id_tenant])
  colegio Colegio? @relation(fields: [id_colegio], references: [id_colegio], onDelete: Cascade)

  calificaciones CalificacionTutoria[]

  @@index([id_tenant])
  @@index([id_colegio])
  @@index([tipo])
  @@index([activo])
}

model CalificacionTutoria {
  id_calificacion_tutoria Int      @id @default(autoincrement())
  id_matricula            Int
  id_bimestre             Int
  id_criterio             Int
  valor                   String?  @db.VarChar(5)
  observacion             String?  @db.VarChar(500)
  id_usuario_registro     Int?
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt

  matricula        Matricula       @relation(fields: [id_matricula], references: [id_matricula], onDelete: Cascade)
  bimestre         Bimestre        @relation(fields: [id_bimestre], references: [id_bimestre], onDelete: Cascade)
  criterio         CriterioTutoria @relation(fields: [id_criterio], references: [id_criterio], onDelete: Cascade)
  usuario_registro Usuario?        @relation("UsuarioCalificacionesTutoria", fields: [id_usuario_registro], references: [id_usuario], onDelete: SetNull)

  @@unique([id_matricula, id_bimestre, id_criterio], name: "uq_calificacion_tutoria")
  @@index([id_matricula])
  @@index([id_bimestre])
  @@index([id_criterio])
  @@index([id_usuario_registro])
}
'''

def find_model_block(text: str, model: str):
    marker = f'model {model} {{'
    start = text.find(marker)
    if start == -1:
        return None
    end = text.find('\n}', start)
    if end == -1:
        raise RuntimeError(f'No se encontró cierre para model {model}')
    return start, end + 3

def ensure_relations(text: str, model: str, lines: list[str]) -> str:
    block_pos = find_model_block(text, model)
    if not block_pos:
        raise RuntimeError(f'No se encontró model {model} en schema.prisma')
    start, end = block_pos
    block = text[start:end]
    insert_lines = [line for line in lines if line.strip().split()[0] not in block]
    if not insert_lines:
        return text
    block = block[:-2].rstrip() + '\n' + '\n'.join(insert_lines) + '\n}'
    return text[:start] + block + text[end:]

def replace_model(text: str, model: str, new_model: str) -> str:
    block_pos = find_model_block(text, model)
    if block_pos:
        start, end = block_pos
        return text[:start] + new_model + text[end:]
    return text.rstrip() + '\n\n' + new_model + '\n'

if not SCHEMA_PATH.exists():
    raise SystemExit('No encuentro api/prisma/schema.prisma. Ejecuta este script desde la raíz del repositorio gestion-escolar-erp.')

text = SCHEMA_PATH.read_text(encoding='utf-8')

for model, lines in RELATIONS.items():
    text = ensure_relations(text, model, lines)

text = replace_model(text, 'ComentarioBimestral', COMENTARIO_BIMESTRAL_MODEL)

if 'model CriterioTutoria {' not in text:
    # Insertar después de ComentarioBimestral para mantener la sección de Tutoría ordenada.
    pos = text.find(COMENTARIO_BIMESTRAL_MODEL)
    if pos == -1:
        text = text.rstrip() + '\n\n' + TUTORIA_MODELS + '\n'
    else:
        insert_at = pos + len(COMENTARIO_BIMESTRAL_MODEL)
        text = text[:insert_at] + TUTORIA_MODELS + text[insert_at:]

SCHEMA_PATH.write_text(text, encoding='utf-8')
print('schema.prisma actualizado para Tutoría. Ahora ejecuta: cd api && npx prisma generate && npm run build')
