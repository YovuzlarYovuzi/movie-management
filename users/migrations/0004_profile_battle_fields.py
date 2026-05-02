from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_profile_hp_episodewatch_moviewatch"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="battle_rating",
            field=models.PositiveIntegerField(default=1000),
        ),
        migrations.AddField(
            model_name="profile",
            name="boss_progress",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="profile",
            name="is_banned",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="ban_reason",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]

