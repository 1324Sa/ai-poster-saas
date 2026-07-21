"use client";

import { useEffect, useRef, useState, ChangeEvent } from "react";
import * as fabric from "fabric";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

interface PosterEditorProps {
  imageUrl?: string;
}

export default function PosterEditor({ imageUrl }: PosterEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // حالات الألوان والأدوات
  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#1e293b");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState("#ef4444");

  // حالات السجل والتراجع (Undo History)
  const historyRef = useRef<string[]>([]);
  const isUndoRedoRef = useRef(false);

  // حالات النوافذ المنبثقة
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showWebImageInput, setShowWebImageInput] = useState(false);
  const [webImageUrl, setWebImageUrl] = useState("");
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // حفظ حالة الكانفاس الحالية للتراجع
  const saveHistory = () => {
    if (isUndoRedoRef.current || !fabricCanvasRef.current) return;
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    if (historyRef.current[historyRef.current.length - 1] !== json) {
      historyRef.current.push(json);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 600,
      backgroundColor: bgColor,
    });
    fabricCanvasRef.current = canvas;

    // تهيئة فرشاة الرسم الحر
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = brushSize;
    canvas.freeDrawingBrush.color = brushColor;

    // استماع للتغيرات لحفظ تاريخ التراجعات
    canvas.on("object:added", saveHistory);
    canvas.on("object:modified", saveHistory);
    canvas.on("object:removed", saveHistory);
    canvas.on("path:created", saveHistory);

    canvas.on("selection:created", updateSelectedColor);
    canvas.on("selection:updated", updateSelectedColor);

    if (imageUrl) {
      fabric.Image.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img) => {
        img.scaleToWidth(500);
        img.scaleToHeight(600);
        canvas.backgroundImage = img;
        canvas.renderAll();
        saveHistory();
      });
    } else {
      saveHistory();
    }

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  const updateSelectedColor = () => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      const textObj = activeObject as fabric.IText;
      if (typeof textObj.fill === "string") {
        setTextColor(textObj.fill);
      }
    }
  };

  // 1. التراجع للخطوة السابقة (Undo)
  const undo = () => {
    if (!fabricCanvasRef.current || historyRef.current.length <= 1) return;

    isUndoRedoRef.current = true;
    historyRef.current.pop(); // التخلص من الحالة الحالية
    const previousState = historyRef.current[historyRef.current.length - 1];

    fabricCanvasRef.current.loadFromJSON(previousState).then(() => {
      fabricCanvasRef.current?.renderAll();
      isUndoRedoRef.current = false;
    });
  };

  // 2. نمط الكتابة/الرسم بخط اليد
  const toggleDrawingMode = () => {
    if (!fabricCanvasRef.current) return;
    const newMode = !isDrawingMode;
    setIsDrawingMode(newMode);
    fabricCanvasRef.current.isDrawingMode = newMode;
    if (newMode && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.width = brushSize;
      fabricCanvasRef.current.freeDrawingBrush.color = brushColor;
    }
  };

  const handleBrushColorChange = (color: string) => {
    setBrushColor(color);
    if (fabricCanvasRef.current && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
    }
  };

  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size);
    if (fabricCanvasRef.current && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.width = size;
    }
  };

  // 3. تطبيق الفلاتر على الصورة المحددة (7 فلاتر)
  const applyFilter = (filterType: string) => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();

    if (!activeObj || activeObj.type !== "image") {
      alert("الرجاء تحديد صورة على الكانفاس أولاً لتطبيق الفلتر عليها!");
      return;
    }

    const imgObj = activeObj as fabric.Image;
    imgObj.filters = []; // إعادة تعيين الفلاتر

    switch (filterType) {
      case "grayscale":
        imgObj.filters.push(new fabric.filters.Grayscale());
        break;
      case "sepia":
        imgObj.filters.push(new fabric.filters.Sepia());
        break;
      case "invert":
        imgObj.filters.push(new fabric.filters.Invert());
        break;
      case "blur":
        imgObj.filters.push(new fabric.filters.Blur({ blur: 0.25 }));
        break;
      case "pixelate":
        imgObj.filters.push(new fabric.filters.Pixelate({ blocksize: 8 }));
        break;
      case "contrast":
        imgObj.filters.push(new fabric.filters.Contrast({ contrast: 0.3 }));
        break;
      case "brightness":
        imgObj.filters.push(new fabric.filters.Brightness({ brightness: 0.2 }));
        break;
      case "none":
      default:
        break;
    }

    imgObj.applyFilters();
    fabricCanvasRef.current.renderAll();
    saveHistory();
  };

  // 4. أداة قص الصورة المحددة (Crop Image)
  const cropSelectedImage = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();

    if (!activeObj || activeObj.type !== "image") {
      alert("الرجاء تحديد صورة لقصها!");
      return;
    }

    const img = activeObj as fabric.Image;
    // اقتطاع 20% من الحواف كمثال قص تفاعلي سريع
    const cropWidth = img.width! * 0.8;
    const cropHeight = img.height! * 0.8;

    img.set({
      cropX: img.width! * 0.1,
      cropY: img.height! * 0.1,
      width: cropWidth,
      height: cropHeight,
    });

    fabricCanvasRef.current.renderAll();
    saveHistory();
  };

  // 5. إضافة نص
  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText("أدخل نص هنا", {
      left: 150,
      top: 250,
      fontSize: 36,
      fill: textColor,
      fontFamily: "Arial",
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  // 6. إضافة إيموجي
  const onEmojiClick = (emojiData: EmojiClickData) => {
    if (!fabricCanvasRef.current) return;
    const emojiText = new fabric.IText(emojiData.emoji, {
      left: 200,
      top: 250,
      fontSize: 50,
    });
    fabricCanvasRef.current.add(emojiText);
    fabricCanvasRef.current.setActiveObject(emojiText);
    fabricCanvasRef.current.renderAll();
    setShowEmojiPicker(false);
  };

  // 7. رفع صورة من الجهاز
  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgObj = new Image();
      imgObj.src = event.target?.result as string;
      imgObj.onload = () => {
        const image = new fabric.Image(imgObj);
        image.scaleToWidth(200);
        image.set({ left: 150, top: 200 });
        fabricCanvasRef.current?.add(image);
        fabricCanvasRef.current?.setActiveObject(image);
        fabricCanvasRef.current?.renderAll();
      };
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 8. إضافة صورة من رابط مع Proxy لتجاوز CORS
  const addWebImage = () => {
    if (!webImageUrl || !fabricCanvasRef.current) return;

    const proxiedUrl = `http://127.0.0.1:8000/api/v1/proxy-image?url=${encodeURIComponent(webImageUrl)}`;

    fabric.Image.fromURL(proxiedUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        img.scaleToWidth(250);
        img.set({ left: 125, top: 175 });
        fabricCanvasRef.current?.add(img);
        fabricCanvasRef.current?.setActiveObject(img);
        fabricCanvasRef.current?.renderAll();
        setWebImageUrl("");
        setShowWebImageInput(false);
      })
      .catch((err) => {
        alert("تعذر تحميل الصورة عبر الرابط!");
        console.error(err);
      });
  };

  // 9. تغيير لون النص
  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    if (!fabricCanvasRef.current) return;

    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      (activeObject as fabric.IText).set("fill", color);
      fabricCanvasRef.current.renderAll();
      saveHistory();
    }
  };

  // 10. تغيير لون الخلفية
  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    if (!fabricCanvasRef.current) return;

    fabricCanvasRef.current.backgroundColor = color;
    fabricCanvasRef.current.renderAll();
    saveHistory();
  };

  // 11. تحميل البوستر النهائي
  const downloadPoster = () => {
    if (!fabricCanvasRef.current) return;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });
    const link = document.createElement("a");
    link.download = "poster.png";
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl max-w-5xl w-full relative">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleLocalImageUpload}
        className="hidden"
      />

      {/* شريط الأدوات الرئيسي */}
      <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 w-full">
        {/* زر التراجع عن الخطوة */}
        <button
          onClick={undo}
          className="bg-rose-700 hover:bg-rose-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow flex items-center gap-1"
          title="تراجع عن آخر عمل"
        >
          ↩️ تراجع
        </button>

        {/* زر الكتابة بخط اليد */}
        <button
          onClick={toggleDrawingMode}
          className={`${
            isDrawingMode ? "bg-amber-500 ring-2 ring-amber-300" : "bg-amber-700 hover:bg-amber-600"
          } text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow`}
        >
          ✏️ {isDrawingMode ? "إنهاء الرسم" : "خط اليد"}
        </button>

        {/* زر إضافة نص */}
        <button
          onClick={addText}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          ➕ نص
        </button>

        {/* زر إضافة إيموجي */}
        <button
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowWebImageInput(false);
            setShowFiltersMenu(false);
          }}
          className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          😀 إيموجي
        </button>

        {/* زر رفع من الجهاز */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          💻 من الجهاز
        </button>

        {/* زر جلب من الإنترنت */}
        <button
          onClick={() => {
            setShowWebImageInput(!showWebImageInput);
            setShowEmojiPicker(false);
            setShowFiltersMenu(false);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          🌐 من الإنترنت
        </button>

        {/* زر الفلاتر */}
        <button
          onClick={() => {
            setShowFiltersMenu(!showFiltersMenu);
            setShowEmojiPicker(false);
            setShowWebImageInput(false);
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          🪄 الفلاتر (7)
        </button>

        {/* زر قص الصورة */}
        <button
          onClick={cropSelectedImage}
          className="bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition shadow"
        >
          ✂️ قص الصورة
        </button>

        {/* منتقي لون النص */}
        <div className="flex items-center gap-1 border-r border-l border-slate-700 px-2">
          <label className="text-[11px] text-slate-300 font-medium">النص:</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => handleTextColorChange(e.target.value)}
            className="w-7 h-7 p-0.5 rounded cursor-pointer bg-slate-700 border border-slate-600"
          />
        </div>

        {/* منتقي لون الخلفية */}
        <div className="flex items-center gap-1 pl-1">
          <label className="text-[11px] text-slate-300 font-medium">الخلفية:</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => handleBgColorChange(e.target.value)}
            className="w-7 h-7 p-0.5 rounded cursor-pointer bg-slate-700 border border-slate-600"
          />
        </div>

        {/* زر التحميل */}
        <button
          onClick={downloadPoster}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition shadow mr-auto"
        >
          ⬇️ تحميل
        </button>
      </div>

      {/* شريط خيارات الرسم بخط اليد عند التفعيل */}
      {isDrawingMode && (
        <div className="flex items-center gap-4 bg-amber-950/60 border border-amber-600/40 p-3 rounded-lg w-full max-w-xl justify-center text-xs">
          <span className="text-amber-300 font-bold">إعدادات قلم اليد:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-300">اللون:</label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => handleBrushColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-300">الحجم ({brushSize}px):</label>
            <input
              type="range"
              min="1"
              max="30"
              value={brushSize}
              onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
              className="w-24 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* قائمة 7 فلاتر للصور */}
      {showFiltersMenu && (
        <div className="flex flex-wrap justify-center gap-2 bg-slate-900 p-3 rounded-lg border border-purple-500/50 shadow-lg w-full max-w-2xl">
          <span className="text-xs text-purple-300 font-bold self-center ml-2">
            اختر فلتر للصورة المحددة:
          </span>
          <button
            onClick={() => applyFilter("none")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            بدون
          </button>
          <button
            onClick={() => applyFilter("grayscale")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            أبيض وأسود
          </button>
          <button
            onClick={() => applyFilter("sepia")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            سبيا (دافئ)
          </button>
          <button
            onClick={() => applyFilter("invert")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            عكس الألوان
          </button>
          <button
            onClick={() => applyFilter("blur")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            ضبابي (Blur)
          </button>
          <button
            onClick={() => applyFilter("pixelate")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            بكسلة (Pixel)
          </button>
          <button
            onClick={() => applyFilter("contrast")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            تباين عالي
          </button>
          <button
            onClick={() => applyFilter("brightness")}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded border border-slate-600"
          >
            إضاءة عالية
          </button>
        </div>
      )}

      {/* نافذة جلب صورة من الويب */}
      {showWebImageInput && (
        <div className="flex gap-2 w-full max-w-lg bg-slate-900 p-3 rounded-lg border border-indigo-500/50 shadow-lg">
          <input
            type="text"
            placeholder="ضع رابط صورة من الإنترنت..."
            value={webImageUrl}
            onChange={(e) => setWebImageUrl(e.target.value)}
            className="flex-1 p-2 rounded bg-slate-800 text-white text-xs border border-slate-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={addWebImage}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-semibold"
          >
            جلب الصورة
          </button>
        </div>
      )}

      {/* نافذة الإيموجي */}
      {showEmojiPicker && (
        <div className="absolute z-50 top-24 shadow-2xl rounded-xl overflow-hidden border border-slate-700">
          <EmojiPicker onEmojiClick={onEmojiClick} theme={"dark" as any} />
        </div>
      )}

      {/* لوحة الرسم / الكانفاس */}
      <div className="border-2 border-indigo-500/30 rounded-xl overflow-hidden shadow-2xl bg-slate-950">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}