import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";

const buildResetPasswordSchema = (messages: { passwordLength: string; passwordsMismatch: string }) =>
  z.object({
    password: z.string().min(6, messages.passwordLength),
    confirmPassword: z.string().min(6, messages.passwordLength),
  }).refine((data) => data.password === data.confirmPassword, {
    message: messages.passwordsMismatch,
    path: ["confirmPassword"],
  });

type ResetPasswordSchema = ReturnType<typeof buildResetPasswordSchema>;
type ResetPasswordFormData = z.infer<ResetPasswordSchema>;

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  const resetPasswordSchema = useMemo(
    () => buildResetPasswordSchema({ 
      passwordLength: t("validation.passwordLength"),
      passwordsMismatch: t("validation.passwordsMismatch")
    }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Check if user has a valid session from password reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasValidToken(true);
      } else {
        // No valid session, redirect to login
        toast({
          title: "Invalid or expired reset link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 2000);
      }
    });
  }, [navigate, toast]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("auth.resetPassword.success"),
          description: "You can now sign in with your new password.",
        });
        
        // Sign out the user so they can log in with new password
        await supabase.auth.signOut();
        
        setTimeout(() => navigate("/login"), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasValidToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Verifying...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-8">
      <div className="mb-4 flex w-full max-w-md justify-end">
        <LanguageSelector size="compact" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t("auth.resetPassword.title")}</CardTitle>
          <CardDescription>{t("auth.resetPassword.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.resetPassword.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password ? <p className="text-sm text-red-500">{errors.password.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.resetPassword.confirmPasswordLabel")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

