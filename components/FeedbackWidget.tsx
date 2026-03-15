import React, { useState } from 'react';
import { Feedback, FeedbackType } from '../types';
import { db } from '../services/db-supabase';

interface FeedbackWidgetProps {
  userId: string;
  userName: string;
  userEmail?: string;
  classId?: string;
  onSubmit?: (feedback: Feedback) => void;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  userId,
  userName,
  userEmail,
  classId,
  onSubmit
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState<number>(0);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const feedback: Feedback = {
      id: crypto.randomUUID(),
      classId,
      userId,
      userName,
      userEmail,
      type: feedbackType,
      rating: rating > 0 ? rating : undefined,
      npsScore: npsScore !== null ? npsScore : undefined,
      comment: comment.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      await db.addFeedback(feedback);
      setSubmitted(true);
      onSubmit?.(feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white text-center">
        <div className="text-5xl mb-3">✓</div>
        <h3 className="m-0 text-lg font-semibold">Thank you for your feedback!</h3>
        <p className="mt-2 opacity-90 text-sm">We appreciate your input.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-neutral-900 rounded-xl border border-neutral-700">
      <h3 className="m-0 mb-5 text-white text-lg font-semibold">
        Share Your Feedback
      </h3>

      {/* Feedback Type Selection */}
      <div className="mb-5">
        <label className="block text-neutral-400 text-xs mb-2 uppercase tracking-wide">
          Category
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFeedbackType('general')}
            className={`flex-1 py-2.5 px-4 rounded-lg border cursor-pointer text-sm transition-all ${
              feedbackType === 'general' 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setFeedbackType('post_class')}
            className={`flex-1 py-2.5 px-4 rounded-lg border cursor-pointer text-sm transition-all ${
              feedbackType === 'post_class' 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            Post-Class
          </button>
          <button
            type="button"
            onClick={() => setFeedbackType('nps')}
            className={`flex-1 py-2.5 px-4 rounded-lg border cursor-pointer text-sm transition-all ${
              feedbackType === 'nps' 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            NPS
          </button>
        </div>
      </div>

      {/* Star Rating */}
      {(feedbackType === 'general' || feedbackType === 'post_class') && (
        <div className="mb-5">
          <label className="block text-neutral-400 text-xs mb-2 uppercase tracking-wide">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="bg-transparent border-none cursor-pointer text-2xl p-1 transition-transform hover:scale-110"
              >
                <span className={`transition-colors ${star <= rating ? 'text-amber-500' : 'text-neutral-600'}`}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NPS Score */}
      {feedbackType === 'nps' && (
        <div className="mb-5">
          <label className="block text-neutral-400 text-xs mb-2 uppercase tracking-wide">
            How likely are you to recommend us? (0-10)
          </label>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 11 }, (_, i) => i).map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setNpsScore(score)}
                className={`w-9 h-9 flex items-center justify-center rounded-md border cursor-pointer text-sm font-medium transition-all ${
                  npsScore === score 
                    ? score <= 6 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : score <= 8 
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-green-500 border-green-500 text-white'
                    : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-neutral-500">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      )}

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-neutral-400 text-xs mb-2 uppercase tracking-wide">
          Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you think..."
          rows={4}
          className="w-full p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white text-sm font-inherit resize-y box-border"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3.5 rounded-lg border-none text-white text-base font-semibold cursor-pointer transition-all ${
          loading 
            ? 'bg-neutral-600 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
        }`}
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};

export default FeedbackWidget;
