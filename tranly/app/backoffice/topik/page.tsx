'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SoundOutlined,
  BookOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { supabase } from '@/app/_lib/supabaseClient';

interface DbTopikQuestion {
  id: string;
  exam_type: 'topik1' | 'topik2';
  type: 'reading' | 'listening';
  passage: string | null;
  question: string;
  choices: string[];
  correct_answer: number;
  audio_src: string | null;
  exam_set_id: string | null;
  created_at: string;
}

interface DbTopikExamSet {
  id: string;
  exam_type: 'topik1' | 'topik2';
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
}

export default function TopikPage() {
  const [activeTab, setActiveTab] = useState<'questions' | 'sets'>('questions');
  const [questions, setQuestions] = useState<DbTopikQuestion[]>([]);
  const [examSets, setExamSets] = useState<DbTopikExamSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Question Filters state
  const [examTypeFilter, setExamTypeFilter] = useState<'all' | 'topik1' | 'topik2'>('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'reading' | 'listening'>('all');
  const [examSetFilter, setExamSetFilter] = useState<string>('all');

  // Exam Set Filters state
  const [setsExamTypeFilter, setSetsExamTypeFilter] = useState<'all' | 'topik1' | 'topik2'>('all');

  // Question Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingQuestion, setEditingQuestion] = useState<Partial<DbTopikQuestion>>({});
  const [choice0, setChoice0] = useState('');
  const [choice1, setChoice1] = useState('');
  const [choice2, setChoice2] = useState('');
  const [choice3, setChoice3] = useState('');

  // Exam Set Form Modal state
  const [isSetFormOpen, setIsSetFormOpen] = useState(false);
  const [setsFormMode, setSetsFormMode] = useState<'create' | 'edit'>('create');
  const [editingSet, setEditingSet] = useState<Partial<DbTopikExamSet>>({});

  useEffect(() => {
    fetchQuestions();
    fetchExamSets();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topik_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setQuestions(data);
      }
    } catch (err) {
      console.error('Error fetching TOPIK questions:', err);
      antdMessage.error('ดึงข้อมูลข้อสอบล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExamSets = async () => {
    try {
      const { data, error } = await supabase
        .from('topik_exam_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setExamSets(data);
      }
    } catch (err) {
      console.error('Error fetching TOPIK exam sets:', err);
      antdMessage.error('ดึงข้อมูลชุดข้อสอบล้มเหลว');
    }
  };

  // --- Question CRUD Actions ---
  const handleOpenCreateForm = () => {
    setFormMode('create');
    setEditingQuestion({
      exam_type: 'topik1',
      type: 'reading',
      passage: '',
      question: '',
      correct_answer: 0,
      audio_src: '',
      exam_set_id: '',
    });
    setChoice0('');
    setChoice1('');
    setChoice2('');
    setChoice3('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (q: DbTopikQuestion) => {
    setFormMode('edit');
    setEditingQuestion({ ...q });
    setChoice0(q.choices[0] || '');
    setChoice1(q.choices[1] || '');
    setChoice2(q.choices[2] || '');
    setChoice3(q.choices[3] || '');
    setIsFormOpen(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบข้อนี้?')) {
      try {
        const { error } = await supabase.from('topik_questions').delete().eq('id', id);
        if (error) throw error;
        antdMessage.success('ลบข้อสอบเรียบร้อยแล้ว');
        fetchQuestions();
      } catch (err) {
        console.error('Failed to delete question:', err);
        antdMessage.error('ลบข้อสอบล้มเหลว');
      }
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingQuestion.question?.trim()) {
      antdMessage.error('กรุณากรอกโจทย์คำถาม');
      return;
    }
    if (!choice0.trim() || !choice1.trim() || !choice2.trim() || !choice3.trim()) {
      antdMessage.error('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ');
      return;
    }
    if (editingQuestion.type === 'listening' && !editingQuestion.audio_src?.trim()) {
      antdMessage.error('กรุณากรอกเส้นทางไฟล์เสียง (Audio Source Path)');
      return;
    }
    if (!editingQuestion.exam_set_id) {
      antdMessage.error('กรุณาเลือกชุดข้อสอบสำหรับคำถามนี้');
      return;
    }

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        antdMessage.error('ไม่พบการยืนยันตัวตนผู้ใช้');
        return;
      }

      const payload = {
        user_id: userId,
        exam_type: editingQuestion.exam_type,
        type: editingQuestion.type,
        passage: editingQuestion.type === 'reading' ? editingQuestion.passage?.trim() || null : null,
        question: editingQuestion.question.trim(),
        choices: [choice0.trim(), choice1.trim(), choice2.trim(), choice3.trim()],
        correct_answer: Number(editingQuestion.correct_answer),
        audio_src: editingQuestion.type === 'listening' ? editingQuestion.audio_src?.trim() || null : null,
        exam_set_id: editingQuestion.exam_set_id,
      };

      if (formMode === 'create') {
        const { error } = await supabase.from('topik_questions').insert(payload);
        if (error) throw error;
        antdMessage.success('สร้างข้อสอบสำเร็จ! 🎉');
      } else {
        const { error } = await supabase
          .from('topik_questions')
          .update(payload)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        antdMessage.success('แก้ไขข้อมูลข้อสอบสำเร็จ! ✏️');
      }

      setIsFormOpen(false);
      fetchQuestions();
    } catch (err) {
      console.error('Failed to save question:', err);
      antdMessage.error('บันทึกข้อมูลข้อสอบไม่สำเร็จ');
    }
  };

  // --- Exam Set CRUD Actions ---
  const handleOpenCreateSetForm = () => {
    setSetsFormMode('create');
    setEditingSet({
      id: '',
      exam_type: 'topik1',
      name: '',
      difficulty: 'beginner',
    });
    setIsSetFormOpen(true);
  };

  const handleOpenEditSetForm = (set: DbTopikExamSet) => {
    setSetsFormMode('edit');
    setEditingSet({ ...set });
    setIsSetFormOpen(true);
  };

  const handleDeleteSet = async (id: string) => {
    const questionCount = questions.filter((q) => q.exam_set_id === id).length;
    let confirmMsg = 'คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบนี้?';
    if (questionCount > 0) {
      confirmMsg = `คำเตือน: ชุดข้อสอบนี้มีคำถามผูกอยู่จำนวน ${questionCount} ข้อ หากลบแล้วข้อสอบทั้งหมดในชุดนี้จะถูกลบไปด้วย! ยืนยันการลบ?`;
    }

    if (confirm(confirmMsg)) {
      try {
        const { error } = await supabase.from('topik_exam_sets').delete().eq('id', id);
        if (error) throw error;
        antdMessage.success('ลบชุดข้อสอบสำเร็จ');
        fetchExamSets();
        fetchQuestions();
      } catch (err) {
        console.error('Failed to delete exam set:', err);
        antdMessage.error('ลบชุดข้อสอบล้มเหลว');
      }
    }
  };

  const handleSubmitSetForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSet.id?.trim()) {
      antdMessage.error('กรุณากรอก ID ของชุดข้อสอบ (เช่น topik1-set-6)');
      return;
    }
    if (!editingSet.name?.trim()) {
      antdMessage.error('กรุณากรอกชื่อชุดข้อสอบ');
      return;
    }

    try {
      const payload = {
        id: editingSet.id.trim(),
        exam_type: editingSet.exam_type,
        name: editingSet.name.trim(),
        difficulty: editingSet.difficulty,
      };

      if (setsFormMode === 'create') {
        const { error } = await supabase.from('topik_exam_sets').insert(payload);
        if (error) throw error;
        antdMessage.success('สร้างชุดข้อสอบสำเร็จ! 🎉');
      } else {
        const { error } = await supabase
          .from('topik_exam_sets')
          .update({
            exam_type: payload.exam_type,
            name: payload.name,
            difficulty: payload.difficulty,
          })
          .eq('id', editingSet.id);
        if (error) throw error;
        antdMessage.success('แก้ไขชุดข้อสอบสำเร็จ! ✏️');
      }

      setIsSetFormOpen(false);
      fetchExamSets();
    } catch (err) {
      console.error('Failed to save exam set:', err);
      antdMessage.error('บันทึกข้อมูลชุดข้อสอบไม่สำเร็จ');
    }
  };

  // --- Filtered Lists ---
  const filteredQuestions = questions.filter((q) => {
    const matchExam = examTypeFilter === 'all' || q.exam_type === examTypeFilter;
    const matchType = questionTypeFilter === 'all' || q.type === questionTypeFilter;
    const matchSet = examSetFilter === 'all' || q.exam_set_id === examSetFilter;
    return matchExam && matchType && matchSet;
  });

  const filteredSets = examSets.filter((s) => {
    return setsExamTypeFilter === 'all' || s.exam_type === setsExamTypeFilter;
  });

  // Filtered dropdown for sets matching current question's type selection
  const currentSets = examSets.filter(
    (s) => s.exam_type === (editingQuestion.exam_type || 'topik1')
  );

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between border-b-3 border-border-color bg-white dark:bg-[#2d2d44] px-6 py-4 shadow-nb-sm z-10">
        <div>
          <h1 className="text-base font-black text-text-primary leading-tight">
            การจัดการข้อสอบ TOPIK
          </h1>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            Manage TOPIK Questions & Sets (Supabase)
          </p>
        </div>

        <button
          type="button"
          onClick={activeTab === 'questions' ? handleOpenCreateForm : handleOpenCreateSetForm}
          className="flex h-9 items-center gap-1.5 px-4 rounded-xl border-3 border-border-color bg-accent-yellow text-black shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs cursor-pointer"
        >
          <PlusOutlined />
          <span>{activeTab === 'questions' ? 'เพิ่มข้อสอบใหม่' : 'เพิ่มชุดข้อสอบใหม่'}</span>
        </button>
      </header>

      {/* Tabs Control */}
      <div className="bg-white dark:bg-[#252538] border-b-3 border-border-color px-6 flex gap-4 shrink-0 z-10 shadow-nb-sm">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`py-3 px-2 border-b-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'border-accent-pink-bg text-accent-pink-bg'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          จัดการข้อสอบ ({questions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sets')}
          className={`py-3 px-2 border-b-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'sets'
              ? 'border-accent-pink-bg text-accent-pink-bg'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          จัดการชุดข้อสอบ ({examSets.length})
        </button>
      </div>

      {/* Filter Bar (Conditional) */}
      {activeTab === 'questions' ? (
        <div className="bg-white dark:bg-[#252538] border-b-3 border-border-color p-4 flex flex-wrap gap-4 items-center z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-text-primary mr-1">ระดับ:</span>
            {(['all', 'topik1', 'topik2'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setExamTypeFilter(type);
                  setExamSetFilter('all'); // reset set filter when level changes
                }}
                className={`px-3 py-1.5 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                  examTypeFilter === type
                    ? 'bg-accent-blue text-white border-border-color shadow-[1px_1px_0_#000]'
                    : 'bg-white dark:bg-[#2d2d44] border-border-color text-text-secondary hover:bg-gray-50'
                }`}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'topik1' ? 'TOPIK I' : 'TOPIK II'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <span className="text-xs font-black text-text-primary mr-1">ประเภท:</span>
            {(['all', 'reading', 'listening'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setQuestionTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                  questionTypeFilter === type
                    ? 'bg-accent-pink-bg text-black border-border-color shadow-[1px_1px_0_#000]'
                    : 'bg-white dark:bg-[#2d2d44] border-border-color text-text-secondary hover:bg-gray-50'
                }`}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'reading' ? 'การอ่าน' : 'การฟัง'}
              </button>
            ))}
          </div>

          {/* Set Filter Dropdown */}
          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <span className="text-xs font-black text-text-primary mr-1">ชุดข้อสอบ:</span>
            <select
              value={examSetFilter}
              onChange={(e) => setExamSetFilter(e.target.value)}
              className="rounded-lg border-2 border-border-color bg-white dark:bg-[#2d2d44] px-2 py-1 text-xs text-text-primary outline-none cursor-pointer"
            >
              <option value="all">ทั้งหมด</option>
              {examSets
                .filter((s) => examTypeFilter === 'all' || s.exam_type === examTypeFilter)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#252538] border-b-3 border-border-color p-4 flex flex-wrap gap-4 items-center z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-text-primary mr-1">ระดับ:</span>
            {(['all', 'topik1', 'topik2'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSetsExamTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                  setsExamTypeFilter === type
                    ? 'bg-accent-blue text-white border-border-color shadow-[1px_1px_0_#000]'
                    : 'bg-white dark:bg-[#2d2d44] border-border-color text-text-secondary hover:bg-gray-50'
                }`}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'topik1' ? 'TOPIK I' : 'TOPIK II'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <main className="flex-1 overflow-y-auto p-6 relative">
        <div className="w-full flex flex-col gap-6">
          {isLoading && (activeTab === 'questions' ? filteredQuestions.length === 0 : filteredSets.length === 0) ? (
            <div className="flex justify-center items-center py-20">
              <span className="font-bold text-text-secondary text-sm">กำลังดึงข้อมูล...</span>
            </div>
          ) : activeTab === 'questions' ? (
            // --- Questions View ---
            filteredQuestions.length === 0 ? (
              <div className="flex justify-center items-center py-20 border-3 border-dashed border-border-color rounded-2xl bg-white dark:bg-[#2d2d44]">
                <span className="font-bold text-text-secondary text-sm">ไม่พบข้อสอบที่ตรงกับตัวกรอง</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {filteredQuestions.map((q) => {
                  const setMeta = examSets.find((s) => s.id === q.exam_set_id);
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-md relative flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-lg border-2 border-border-color px-2 py-0.5 text-[10px] font-black text-white ${
                            q.exam_type === 'topik1' ? 'bg-accent-blue' : 'bg-accent-red'
                          }`}>
                            {q.exam_type === 'topik1' ? 'TOPIK I' : 'TOPIK II'}
                          </span>
                          <span className="rounded-lg border-2 border-border-color bg-accent-yellow text-black px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                            {q.type === 'reading' ? <BookOutlined /> : <SoundOutlined />}
                            <span>{q.type === 'reading' ? 'การอ่าน' : 'การฟัง'}</span>
                          </span>
                        </div>

                        {/* Exam Set Indicator */}
                        <div className="text-[10px] font-bold text-accent-red bg-accent-pink-bg/10 px-2 py-1 rounded-md border border-border-color/10 flex items-center gap-1 mt-1">
                          <FolderOpenOutlined />
                          <span>ชุดข้อสอบ: {setMeta ? `${setMeta.name} (${q.exam_set_id})` : `ไม่ระบุชุด (${q.exam_set_id})`}</span>
                        </div>

                        {/* Passage (if reading) */}
                        {q.type === 'reading' && q.passage && (
                          <div className="mt-2 p-2.5 rounded-lg border border-dashed border-border-color bg-gray-50 dark:bg-gray-800/40 text-xs italic text-text-secondary font-medium leading-relaxed line-clamp-3">
                            {q.passage}
                          </div>
                        )}

                        {/* Question */}
                        <h3 className="text-sm font-black text-text-primary mt-1">
                          {q.question}
                        </h3>

                        {/* Audio Src (if listening) */}
                        {q.type === 'listening' && q.audio_src && (
                          <div className="text-[10px] font-semibold text-text-secondary bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md mt-1 flex items-center gap-1 border border-border-color/10">
                            <SoundOutlined />
                            <span className="truncate">ไฟล์เสียง: {q.audio_src}</span>
                          </div>
                        )}

                        {/* Choices */}
                        <div className="flex flex-col gap-1.5 mt-2.5">
                          {q.choices.map((choice, idx) => {
                            const isCorrect = idx === q.correct_answer;
                            return (
                              <div
                                key={idx}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-xs font-semibold ${
                                  isCorrect
                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-bold'
                                    : 'bg-white dark:bg-[#1a1a2e] border-border-color/20 text-text-secondary'
                                }`}
                              >
                                <span className={`w-5 h-5 shrink-0 flex items-center justify-center rounded-full border text-[10px] font-bold ${
                                  isCorrect ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="flex-1 leading-snug">{choice}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2.5 mt-2 pt-3 border-t border-gray-100 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(q)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                        >
                          <EditOutlined style={{ fontSize: 12 }} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                        >
                          <DeleteOutlined style={{ fontSize: 12 }} />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // --- Sets View ---
            filteredSets.length === 0 ? (
              <div className="flex justify-center items-center py-20 border-3 border-dashed border-border-color rounded-2xl bg-white dark:bg-[#2d2d44]">
                <span className="font-bold text-text-secondary text-sm">ไม่พบชุดข้อสอบที่ตรงกับตัวกรอง</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                {filteredSets.map((s) => {
                  const setQuestionsCount = questions.filter((q) => q.exam_set_id === s.id).length;
                  return (
                    <div
                      key={s.id}
                      className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-md relative flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-lg border-2 border-border-color px-2 py-0.5 text-[10px] font-black text-white ${
                            s.exam_type === 'topik1' ? 'bg-accent-blue' : 'bg-accent-red'
                          }`}>
                            {s.exam_type === 'topik1' ? 'TOPIK I' : 'TOPIK II'}
                          </span>
                          <span className="rounded-lg border-2 border-border-color bg-accent-pink-bg text-black px-2 py-0.5 text-[10px] font-black uppercase">
                            {s.difficulty === 'beginner'
                              ? 'ระดับต้น'
                              : s.difficulty === 'intermediate'
                              ? 'ระดับกลาง'
                              : 'ระดับสูง'}
                          </span>
                        </div>

                        {/* Set Name & ID */}
                        <h3 className="text-base font-black text-text-primary mt-2">
                          {s.name}
                        </h3>
                        <p className="text-[10px] font-mono text-text-secondary">
                          ID: {s.id}
                        </p>

                        {/* Questions Count Indicator */}
                        <div className="mt-2 text-xs font-bold text-text-primary bg-[#FFF9F0] dark:bg-gray-800 px-3 py-2 rounded-xl border-2 border-border-color shadow-nb-sm flex items-center justify-between">
                          <span>จำนวนข้อสอบ:</span>
                          <span className="text-accent-red">{setQuestionsCount} ข้อ</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2.5 mt-2 pt-3 border-t border-gray-100 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSetForm(s)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                        >
                          <EditOutlined style={{ fontSize: 12 }} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(s.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                        >
                          <DeleteOutlined style={{ fontSize: 12 }} />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>

      {/* Question CRUD Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsFormOpen(false)}
          />

          <div className="relative w-full max-w-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-6 rounded-2xl shadow-nb-lg z-10 animate-bubble-pop-in flex flex-col h-[90dvh] min-h-0">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-border-color pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-accent-red">
                  {formMode === 'create' ? 'เพิ่มข้อสอบใหม่' : 'แก้ไขข้อสอบ'}
                </span>
                <h3 className="text-lg font-black text-text-primary leading-tight mt-0.5">
                  {formMode === 'create' ? 'สร้างข้อสอบ TOPIK ใหม่' : 'แก้ไขข้อมูลข้อสอบ TOPIK'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-border-color flex items-center justify-center font-extrabold hover:bg-accent-pink-bg hover:text-black transition-colors cursor-pointer text-text-primary text-sm shadow-nb-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ระดับข้อสอบ *</label>
                  <select
                    value={editingQuestion.exam_type || 'topik1'}
                    onChange={(e) => {
                      const level = e.target.value as any;
                      setEditingQuestion((prev) => ({
                        ...prev,
                        exam_type: level,
                        exam_set_id: '', // reset selected set since level changed
                      }));
                    }}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="topik1">TOPIK I (ระดับต้น)</option>
                    <option value="topik2">TOPIK II (ระดับกลาง-สูง)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ประเภททักษะ *</label>
                  <select
                    value={editingQuestion.type || 'reading'}
                    onChange={(e) => setEditingQuestion((prev) => ({ ...prev, type: e.target.value as any }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="reading">📖 การอ่าน (Reading)</option>
                    <option value="listening">🎧 การฟัง (Listening)</option>
                  </select>
                </div>
              </div>

              {/* Set Selection Dropdown */}
              <div>
                <label className="block text-xs font-black text-text-primary mb-1">ชุดข้อสอบ *</label>
                <select
                  value={editingQuestion.exam_set_id || ''}
                  onChange={(e) => setEditingQuestion((prev) => ({ ...prev, exam_set_id: e.target.value }))}
                  className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                >
                  <option value="" disabled>-- เลือกชุดข้อสอบ --</option>
                  {currentSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
                {currentSets.length === 0 && (
                  <p className="text-[10px] text-accent-red mt-1 font-semibold">
                    * ไม่พบชุดข้อสอบในระดับนี้ กรุณาไปสร้างชุดข้อสอบที่แถบ "จัดการชุดข้อสอบ" ก่อน
                  </p>
                )}
              </div>

              {/* Conditional Field: Passage (only for Reading) */}
              {editingQuestion.type === 'reading' && (
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ข้อความบทอ่าน (Passage / Context)</label>
                  <textarea
                    rows={4}
                    value={editingQuestion.passage || ''}
                    onChange={(e) => setEditingQuestion((prev) => ({ ...prev, passage: e.target.value }))}
                    placeholder="เช่น 오늘 날씨가 좋습니다. 공원에 사람이 많습니다. (ปล่อยว่างได้ถ้าไม่มีบทอ่าน)"
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
              )}

              {/* Conditional Field: Audio Source (only for Listening) */}
              {editingQuestion.type === 'listening' && (
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">เส้นทางไฟล์เสียง (Audio Src Path) *</label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.audio_src || ''}
                    onChange={(e) => setEditingQuestion((prev) => ({ ...prev, audio_src: e.target.value }))}
                    placeholder="เช่น /audio/topik/topik1/l-001.mp3"
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-text-primary mb-1">โจทย์คำถาม *</label>
                <textarea
                  rows={2}
                  required
                  value={editingQuestion.question || ''}
                  onChange={(e) => setEditingQuestion((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="เช่น 오늘 날씨는 어떻습니까?"
                  className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                />
              </div>

              {/* Choices & Correct Answer */}
              <div className="flex flex-col gap-3 border-t border-dashed border-border-color pt-3">
                <label className="block text-xs font-black text-text-primary">ตัวเลือกคำตอบทั้ง 4 ตัวเลือก *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">ตัวเลือกที่ 1 *</label>
                    <input
                      type="text"
                      required
                      value={choice0}
                      onChange={(e) => setChoice0(e.target.value)}
                      placeholder="ตัวเลือก 1"
                      className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">ตัวเลือกที่ 2 *</label>
                    <input
                      type="text"
                      required
                      value={choice1}
                      onChange={(e) => setChoice1(e.target.value)}
                      placeholder="ตัวเลือก 2"
                      className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">ตัวเลือกที่ 3 *</label>
                    <input
                      type="text"
                      required
                      value={choice2}
                      onChange={(e) => setChoice2(e.target.value)}
                      placeholder="ตัวเลือก 3"
                      className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">ตัวเลือกที่ 4 *</label>
                    <input
                      type="text"
                      required
                      value={choice3}
                      onChange={(e) => setChoice3(e.target.value)}
                      placeholder="ตัวเลือก 4"
                      className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-xs font-black text-text-primary mb-1">ตัวเลือกที่ถูกต้อง *</label>
                  <select
                    value={editingQuestion.correct_answer === undefined ? 0 : editingQuestion.correct_answer}
                    onChange={(e) => setEditingQuestion((prev) => ({ ...prev, correct_answer: Number(e.target.value) }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value={0}>ตัวเลือกที่ 1: {choice0 || '(ยังไม่ได้กรอก)'}</option>
                    <option value={1}>ตัวเลือกที่ 2: {choice1 || '(ยังไม่ได้กรอก)'}</option>
                    <option value={2}>ตัวเลือกที่ 3: {choice2 || '(ยังไม่ได้กรอก)'}</option>
                    <option value={3}>ตัวเลือกที่ 4: {choice3 || '(ยังไม่ได้กรอก)'}</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex gap-3 border-t-2 border-border-color pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary text-sm font-bold shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitForm}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-accent-green text-white text-sm font-black shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                {formMode === 'create' ? 'สร้างข้อสอบ' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Set CRUD Form Modal */}
      {isSetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsSetFormOpen(false)}
          />

          <div className="relative w-full max-w-md border-3 border-border-color bg-white dark:bg-[#2d2d44] p-6 rounded-2xl shadow-nb-lg z-10 animate-bubble-pop-in flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-border-color pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-accent-red">
                  {setsFormMode === 'create' ? 'เพิ่มชุดข้อสอบใหม่' : 'แก้ไขชุดข้อสอบ'}
                </span>
                <h3 className="text-lg font-black text-text-primary leading-tight mt-0.5">
                  {setsFormMode === 'create' ? 'สร้างชุดข้อสอบ TOPIK ใหม่' : 'แก้ไขข้อมูลชุดข้อสอบ TOPIK'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSetFormOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-border-color flex items-center justify-center font-extrabold hover:bg-accent-pink-bg hover:text-black transition-colors cursor-pointer text-text-primary text-sm shadow-nb-sm"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitSetForm} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black text-text-primary mb-1">ชุดข้อสอบ ID (Unique) *</label>
                <input
                  type="text"
                  required
                  disabled={setsFormMode === 'edit'}
                  value={editingSet.id || ''}
                  onChange={(e) => setEditingSet((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="เช่น topik1-set-6 (ห้ามซ้ำ)"
                  className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:cursor-not-allowed px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-text-primary mb-1">ชื่อชุดข้อสอบ *</label>
                <input
                  type="text"
                  required
                  value={editingSet.name || ''}
                  onChange={(e) => setEditingSet((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น TOPIK I - ชุดที่ 6"
                  className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ระดับข้อสอบ *</label>
                  <select
                    value={editingSet.exam_type || 'topik1'}
                    onChange={(e) => setEditingSet((prev) => ({ ...prev, exam_type: e.target.value as any }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="topik1">TOPIK I</option>
                    <option value="topik2">TOPIK II</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ความยาก *</label>
                  <select
                    value={editingSet.difficulty || 'beginner'}
                    onChange={(e) => setEditingSet((prev) => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="beginner">ระดับต้น (Beginner)</option>
                    <option value="intermediate">ระดับกลาง (Intermediate)</option>
                    <option value="advanced">ระดับสูง (Advanced)</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex gap-3 border-t-2 border-border-color pt-3">
              <button
                type="button"
                onClick={() => setIsSetFormOpen(false)}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary text-sm font-bold shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitSetForm}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-accent-green text-white text-sm font-black shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                {setsFormMode === 'create' ? 'สร้างชุดข้อสอบ' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
