BEGIN;
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
-- Abort rather than lock out all administrators.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE membership_status='approved' AND game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер')) THEN
 RAISE EXCEPTION 'No approved member with administrative rank. Assign an eligible rank before migration.';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.is_site_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND membership_status='approved' AND game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер'));
$$;
-- Protect direct profile writes; privileged RPCs execute as their owner.
CREATE OR REPLACE FUNCTION public.guard_profile_rank_v288() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер') OR NEW.membership_status='approved' THEN RAISE EXCEPTION 'Protected membership fields'; END IF;
  ELSIF NEW.game_rank IS DISTINCT FROM OLD.game_rank OR NEW.membership_status IS DISTINCT FROM OLD.membership_status THEN
   RAISE EXCEPTION 'Protected membership fields';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_rank_v288 ON public.profiles;
CREATE TRIGGER guard_profile_rank_v288 BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_rank_v288();
CREATE OR REPLACE FUNCTION public.admin_set_member_rank(target_user_id uuid,new_rank text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
 IF NOT public.is_site_admin() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;
 IF new_rank IS NULL OR new_rank NOT IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер','Мастер','Подмастерье','Возница','Охрана','Последователь','Послушник','Союзник') THEN RAISE EXCEPTION 'Недопустимое звание'; END IF;
 UPDATE public.profiles SET game_rank=new_rank,updated_at=now() WHERE id=target_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Участник не найден'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE membership_status='approved' AND game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер')) THEN RAISE EXCEPTION 'Cannot remove last administrator'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.admin_set_member_status(target_user_id uuid,new_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
 IF NOT public.is_site_admin() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;
 IF new_status IS NULL OR new_status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Недопустимый статус'; END IF;
 UPDATE public.profiles SET membership_status=new_status,updated_at=now() WHERE id=target_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Участник не найден'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE membership_status='approved' AND game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер')) THEN RAISE EXCEPTION 'Cannot remove last administrator'; END IF;
END $$;
CREATE TEMP TABLE rank_backup_v288 ON COMMIT DROP AS SELECT * FROM public.guild_rank_descriptions;
ALTER TABLE public.guild_rank_descriptions DROP CONSTRAINT guild_rank_descriptions_rank_level_check;
ALTER TABLE public.guild_rank_descriptions ADD CONSTRAINT guild_rank_descriptions_rank_level_check CHECK(rank_level BETWEEN 1 AND 14);
DELETE FROM public.guild_rank_descriptions;
INSERT INTO public.guild_rank_descriptions(rank_level,rank_name,description,updated_at,updated_by)
SELECT v.level,v.name,coalesce(b.description,''),coalesce(b.updated_at,now()),b.updated_by FROM (VALUES (14,'Глава гильдии'),
(13,'Старейшина гильдии'),
(12,'Казначей'),
(11,'Писарь'),
(10,'Купец'),
(9,'Десятник'),
(8,'Гильдмастер'),
(7,'Мастер'),
(6,'Подмастерье'),
(5,'Возница'),
(4,'Охрана'),
(3,'Последователь'),
(2,'Послушник'),
(1,'Союзник')) v(level,name) LEFT JOIN rank_backup_v288 b ON b.rank_name=v.name;
CREATE OR REPLACE FUNCTION public.guild_rank_description_set(p_rank_level smallint,p_description text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF NOT public.is_site_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF p_rank_level NOT BETWEEN 1 AND 14 THEN RAISE EXCEPTION 'Unknown rank'; END IF;
 IF char_length(coalesce(p_description,'')) > 1000 THEN RAISE EXCEPTION 'Description too long'; END IF;
 UPDATE public.guild_rank_descriptions SET description=btrim(coalesce(p_description,'')),updated_at=now(),updated_by=auth.uid() WHERE rank_level=p_rank_level;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rank not found'; END IF;
END $$;
COMMIT;
