import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { buildAcademicReport, UMSS_COLORS, type AcademicBlock, type AcademicMetadata } from './academicReport';
import type { AnalysisReport } from './reports';

const W = 595.28, H = 841.89, M = 56, CW = W - M * 2, BOTTOM = 72;
const hex = (value: string) => rgb(...[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255) as [number,number,number]);
const BLUE = hex(UMSS_COLORS.azul), RED = hex(UMSS_COLORS.rojo), INK = rgb(.08,.1,.14), GRAY = rgb(.31,.35,.4), LIGHT = rgb(.9,.933,.969), LINE = rgb(.82,.84,.87);
const fmt = (v: number, digits = 1) => v.toLocaleString('es-BO',{maximumFractionDigits:digits});

export async function academicReportToPdf(report: AnalysisReport, metadata: Partial<AcademicMetadata> = {}, logo?: Uint8Array): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    const normal = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const model = buildAcademicReport(report);
    const clean = (value: unknown, font = normal) => Array.from(String(value ?? '').normalize('NFC').replace(/χ²/g,'chi-cuadrada').replace(/χ/g,'chi').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''))
        .map(c=>{try{font.encodeText(c);return c;}catch{return '-';}}).join('');
    const wrap = (text: unknown, width: number, size = 10.5, font = normal) => {
        const lines: string[] = [];
        for (const paragraph of clean(text,font).split('\n')) {
            let current = '';
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
                if (font.widthOfTextAtSize(word,size) > width) {
                    if(current){lines.push(current);current='';}
                    for(const char of word){if(font.widthOfTextAtSize(current+char,size)>width){lines.push(current);current='';}current+=char;}
                } else {
                    const candidate = current ? `${current} ${word}` : word;
                    if(font.widthOfTextAtSize(candidate,size)>width){lines.push(current);current=word;}else current=candidate;
                }
            }
            lines.push(current);
        }
        return lines;
    };
    const put = (page: PDFPage,text: unknown,x: number,y: number,size=10.5,font=normal,color=INK) => page.drawText(clean(text,font),{x,y,size,font,color});
    const center = (page: PDFPage,text: string,y: number,size=12,font=normal,color=INK) => put(page,text,(W-font.widthOfTextAtSize(clean(text,font),size))/2,y,size,font,color);
    const cover = document.addPage([W,H]);
    const toc = document.addPage([W,H]);
    let page: PDFPage, y = 0;
    const newPage = () => { page=document.addPage([W,H]);y=H-82; };
    const ensure = (height: number) => {if(y-height<BOTTOM)newPage();};
    const paragraph = (text: string,size=10.5,color=INK) => {
        for(const line of wrap(text,CW,size)){ensure(size*1.45);put(page,line,M,y,size,normal,color);y-=size*1.45;}y-=9;
    };
    const heading = (text: string,major=false) => {
        const size=major?16:12;
        const lines=wrap(text,CW,size,bold);ensure(lines.length*size*1.4+40);y-=major?0:8;
        lines.forEach(line=>{put(page,line,M,y,size,bold,BLUE);y-=size*1.4;});y-=8;
    };
    const note = (text: string) => paragraph(text,9,GRAY);

    // Cover: proportions of the official escudo are preserved.
    center(cover,'UNIVERSIDAD MAYOR DE SAN SIMÓN',768,17,bold,BLUE);
    center(cover,'Facultad de Ciencias y Tecnología',742,12);
    center(cover,'Carrera de Ingeniería en Sistemas',722,12);
    if(logo){const image=await document.embedJpg(logo);const s=Math.min(100/image.width,145/image.height);cover.drawImage(image,{x:(W-image.width*s)/2,y:548,width:image.width*s,height:image.height*s});}
    let cy=500;
    for(const line of wrap(model.titulo,CW,23,bold)){center(cover,line,cy,23,bold,BLUE);cy-=29;}
    cy-=10;
    for(const line of wrap(model.subtitulo,CW-10,12)){center(cover,line,cy,12);cy-=18;}
    center(cover,'Taller de Simulación',cy-36,12,bold);
    cy=Math.min(cy-85,310);
    for(const line of wrap(`Autoría: ${String(metadata.autores ?? '').trim().slice(0,240) || 'Por completar por el equipo'}`,CW,11)){center(cover,line,cy,11);cy-=16;}
    cy-=10;
    for(const line of wrap(`Docente: ${String(metadata.docente ?? '').trim().slice(0,120) || 'Por completar'}`,CW,11)){center(cover,line,cy,11);cy-=16;}
    cy-=25;
    for(const line of wrap(`Gestión o periodo: ${String(metadata.periodo ?? '').trim().slice(0,80) || 'Por completar'}`,CW,11)){center(cover,line,cy,11);cy-=16;}
    center(cover,'Cochabamba Bolivia',140,11);
    center(cover,new Date(report.generadoUTC).toLocaleDateString('es-BO',{timeZone:'America/La_Paz',day:'numeric',month:'long',year:'numeric'}),121,11);
    center(cover,'Versión para revisión académica',92,10,bold,RED);

    const contents: {title:string; page:number}[] = [];
    let figureCount=0;
    for(const [sectionIndex,section] of model.sections.entries()){
        if(sectionIndex===0 || y<280 || section.titulo.startsWith('Anexo')) newPage();else y-=24;
        contents.push({title:section.titulo,page:document.getPageCount()});heading(section.titulo,true);
        for(const block of section.bloques){
            if(block.tipo==='texto') paragraph(block.texto);
            else if(block.tipo==='subtitulo') heading(block.texto);
            else if(block.tipo==='tabla') drawTable(block);
            else if(block.tipo==='barras') drawBars(block);
            else drawRadar(block);
        }
    }

    function drawTable(block: Extract<AcademicBlock,{tipo:'tabla'}>) {
        if(!block.filas.length){heading(block.titulo);note('No hay respuestas disponibles para esta tabla.');return;}
        const fractions=block.anchos ?? block.columnas.map((_,i)=>i===0?.3:.7/(block.columnas.length-1));
        const widths=fractions.map(f=>f*CW),size=9.2,lineHeight=12;
        const heightFor = (row: unknown[],font:PDFFont) => Math.max(...row.map((v,i)=>wrap(v,widths[i]-14,size,font).length))*lineHeight+16;
        const headerHeight=heightFor(block.columnas,bold);
        const fullHeight=35+headerHeight+block.filas.reduce((n,row)=>n+heightFor(row,normal),0)+40;
        // Keep compact academic tables intact instead of orphaning a single row.
        ensure(fullHeight < H-160 ? fullHeight : 35+headerHeight+heightFor(block.filas[0],normal));
        heading(block.titulo);
        const drawRow=(row: unknown[],header:boolean,index=0)=>{
            const height=heightFor(row,header?bold:normal);let x=M;
            row.forEach((v,i)=>{
                let fill=header?BLUE:index%2?LIGHT:rgb(1,1,1),color=header?rgb(1,1,1):INK;
                // In the observed cross-table use the institutional blue scale by row.
                if(!header && block.titulo.startsWith('Tabla 11') && index<block.filas.length-1 && i>0 && i<row.length-1){
                    const total=Number(row[row.length-1]),ratio=total?Number(v)/total:0;
                    fill=ratio>=.7?BLUE:ratio>=.3?rgb(.65,.76,.87):ratio>0?LIGHT:rgb(.96,.96,.96);color=ratio>=.7?rgb(1,1,1):INK;
                }
                page.drawRectangle({x,y:y-height+4,width:widths[i],height,color:fill,borderColor:LINE,borderWidth:.5});
                const lines=wrap(v,widths[i]-14,size,header?bold:normal);
                lines.forEach((line,j)=>{
                    const offset=i===0 || (!header && String(v).length>45)?7:Math.max(7,(widths[i]-(header?bold:normal).widthOfTextAtSize(line,size))/2);
                    put(page,line,x+offset,y-10-j*lineHeight,size,header?bold:normal,color);
                });x+=widths[i];
            });y-=height;
        };
        drawRow(block.columnas,true);
        block.filas.forEach((row,index)=>{
            const height=heightFor(row,normal);
            if(y-height<BOTTOM+20){newPage();put(page,`${block.titulo} continuación`,M,y,10,bold,BLUE);y-=22;drawRow(block.columnas,true);}
            drawRow(row,false,index);
        });y-=16;note(block.nota);
    }

    function drawBars(block: Extract<AcademicBlock,{tipo:'barras'}>) {
        const data=block.categorias;
        if(!data.length){heading(block.titulo);note('No hay categorías válidas para graficar.');return;}
        const rows=data.map(row=>({row,lines:wrap(row.nombre,CW-110,10)}));
        ensure(45+rows.reduce((n,r)=>n+r.lines.length*14+25,0)+45);
        heading(block.titulo);
        for(const {row,lines} of rows){
            ensure(lines.length*14+36);
            lines.forEach(line=>{put(page,line,M,y,10);y-=14;});
            put(page,`${fmt(row.porcentaje)}% (${row.cantidad})`,W-M-100,y+14,10,bold,BLUE);
            page.drawRectangle({x:M,y:y-8,width:CW,height:8,color:LIGHT});
            page.drawRectangle({x:M,y:y-8,width:Math.min(100,Math.max(0,row.porcentaje))/100*CW,height:8,color:BLUE});y-=28;
        }y-=2;note(block.nota);figureCount++;
    }

    function drawRadar(block: Extract<AcademicBlock,{tipo:'radar'}>) {
        const data=block.grupo?.ejes ?? [];
        if(data.length<3 || data.some(r=>r.media===null)){heading(block.titulo);note('No hay una media válida para todos los ejes; no se dibujan ausencias como cero.');return;}
        ensure(395);heading(block.titulo);
        const cx=W/2,cy=y-105,radius=83,n=data.length;
        const point=(i:number,v:number)=>({x:cx+Math.cos(Math.PI/2-i*2*Math.PI/n)*radius*v/3,y:cy+Math.sin(Math.PI/2-i*2*Math.PI/n)*radius*v/3});
        for(const ring of [1,2,3])for(let i=0;i<n;i++)page.drawLine({start:point(i,ring),end:point((i+1)%n,ring),color:LINE,thickness:.6});
        for(let i=0;i<n;i++){
            page.drawLine({start:{x:cx,y:cy},end:point(i,3),color:LINE,thickness:.5});
            const p=point(i,Number(data[i].media)),next=point((i+1)%n,Number(data[(i+1)%n].media));
            page.drawLine({start:p,end:next,color:RED,thickness:2});page.drawCircle({x:p.x,y:p.y,size:3,color:RED});
            const label=point(i,3.5);put(page,String(i+1),label.x-3,label.y-3,10,bold,BLUE);
        }
        put(page,'1',cx+6,cy+radius/3,8,normal,GRAY);put(page,'2',cx+6,cy+radius*2/3,8,normal,GRAY);put(page,'3',cx+6,cy+radius,8,normal,GRAY);
        y-=230;
        drawTable({tipo:'tabla',titulo:'Valores de la figura',columnas:['Eje','Valoración','Media de 3','n válido'],filas:data.map((r,i)=>[i+1,r.nombre,fmt(Number(r.media),2),r.validas]),nota:block.nota,anchos:[.08,.62,.16,.14]});figureCount++;
    }

    // Populate the reserved contents page only after page numbers are known.
    page=toc;y=H-82;heading('Contenido y resumen ejecutivo',true);
    for(const entry of contents){
        const lines=wrap(entry.title,CW-50,11);
        lines.forEach((line,i)=>{put(toc,line,M,y,11);if(i===0)put(toc,String(entry.page),W-M-22,y,11,bold,BLUE);y-=16;});y-=9;
    }
    heading('Resumen ejecutivo');paragraph(model.resumen);
    note('Palabras clave: empleabilidad, formación continua, competencias profesionales, análisis de mercado, UMSS.');

    const pages=document.getPages();
    pages.forEach((p,index)=>{
        if(index>0){put(p,'UMSS  Ingeniería en Sistemas',M,H-36,8,bold,BLUE);put(p,'Análisis de mercado',W-M-117,H-36,8,normal,GRAY);p.drawLine({start:{x:M,y:H-45},end:{x:W-M,y:H-45},thickness:1,color:RED});}
        p.drawLine({start:{x:M,y:50},end:{x:W-M,y:50},thickness:.6,color:LINE});
        put(p,`Reporte ${report.huella.slice(0,12)}  |  ${report.version}`,M,36,8,normal,GRAY);
        put(p,`${index+1} / ${pages.length}`,W-M-45,36,8,normal,GRAY);
    });
    document.setTitle(model.titulo);document.setSubject('Análisis académico de mercado a partir de encuestas');
    document.setAuthor(String(metadata.autores ?? '').trim().slice(0,240) || 'Autoría no consignada');
    document.setCreator('Sistema de Encuestas UMSS');document.setKeywords(['UMSS','empleabilidad','posgrado','competencias','análisis de mercado']);
    document.setCreationDate(new Date(report.generadoUTC));
    // Used only for metadata, not as an assertion that a simulation was performed.
    document.setProducer(`Sistema de Encuestas - ${figureCount} figuras descriptivas`);
    return document.save();
}
