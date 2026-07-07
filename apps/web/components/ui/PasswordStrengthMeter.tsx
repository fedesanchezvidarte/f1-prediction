"use client";

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthLevel {
  label: string;
  color: string;
  barColor: string;
  score: number;
}

function getStrength(password: string): StrengthLevel {
  if (!password) {
    return { label: "", color: "text-muted", barColor: "bg-border", score: 0 };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Very weak", color: "text-f1-red", barColor: "bg-f1-red", score: 1 };
  if (score === 2) return { label: "Weak", color: "text-f1-amber", barColor: "bg-f1-amber", score: 2 };
  if (score === 3) return { label: "Fair", color: "text-yellow-400", barColor: "bg-yellow-400", score: 3 };
  if (score === 4) return { label: "Strong", color: "text-f1-green", barColor: "bg-f1-green", score: 4 };
  return { label: "Very strong", color: "text-f1-green", barColor: "bg-f1-green", score: 5 };
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              level <= strength.score ? strength.barColor : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${strength.color}`}>
        {strength.label}
      </p>
    </div>
  );
}
