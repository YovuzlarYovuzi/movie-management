from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_profile_battle_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="owned_skins",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="profile",
            name="active_skin",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="damage_multiplier",
            field=models.FloatField(default=1.0),
        ),
        migrations.AddField(
            model_name="profile",
            name="skill_multiplier",
            field=models.FloatField(default=1.0),
        ),
    ]

