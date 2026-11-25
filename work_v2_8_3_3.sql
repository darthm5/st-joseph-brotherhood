BEGIN;
CREATE OR REPLACE FUNCTION public.work_review_report(p_report_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_report public.work_reports%rowtype; v_task public.work_tasks%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_site_admin() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;
  IF p_approve IS NULL THEN RAISE EXCEPTION 'Не указано решение'; END IF;
  -- Serializes reviews against submission and cancellation of the same task.
  SELECT task_id INTO v_report.task_id FROM public.work_reports WHERE id=p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Отчёт не найден'; END IF;
  SELECT * INTO v_task FROM public.work_tasks WHERE id=v_report.task_id FOR UPDATE;
  SELECT * INTO v_report FROM public.work_reports WHERE id=p_report_id FOR UPDATE;
  IF v_report.status <> 'pending' OR v_task.status <> 'submitted'
     OR v_task.assigned_to IS DISTINCT FROM v_report.user_id THEN
    RAISE EXCEPTION 'Отчёт уже рассмотрен или поручение изменено'; END IF;
  IF p_approve AND split_part(v_report.report_text, chr(10), 1) = 'Не выполнено' THEN RAISE EXCEPTION 'Нельзя подтвердить невыполненное поручение'; END IF;
  UPDATE public.work_reports
  SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_report_id;
  UPDATE public.work_tasks
  SET status=CASE WHEN p_approve THEN 'completed' ELSE 'assigned' END,
      updated_at=now() WHERE id=v_task.id;
END; $$;

COMMIT;
