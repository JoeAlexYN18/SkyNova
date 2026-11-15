import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/presentation/components/BrandLogo';
import { ToastHost } from '@/presentation/components/ToastHost';
import { colors, radius, spacing } from '@/shared/theme';

export function AboutSkyNovaModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Conoce SkyNova</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Cerrar información de SkyNova">
            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <BrandLogo size={70} iconSize={44} />
            <Text style={styles.brand}>SkyNova</Text>
            <Text style={styles.tagline}>Tecnología para llegar un poco más lejos.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>NUESTRA HISTORIA</Text>
            <Text style={styles.title}>El equipo que también disfruta elegir su próximo vuelo.</Text>
            <Text style={styles.body}>
              SkyNova nació como una tienda especializada para quienes no quieren perderse entre fichas técnicas. Reunimos drones, accesorios y repuestos en un solo lugar, con información clara para que cada persona encuentre el equipo adecuado, desde su primer vuelo hasta un trabajo profesional.
            </Text>
            <Text style={[styles.body, styles.bodyLast]}>
              Preferimos recomendar la batería o el repuesto correcto antes que venderte algo que no necesitas. Si tienes dudas, nuestro equipo te ayuda a comparar opciones y a preparar tu equipo para el siguiente despegue.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>ESTAMOS PARA AYUDAR</Text>
            <ContactRow icon="email-outline" label="Correo de soporte" value="SoporteSkyNova@Outlook.com" />
            <View style={styles.divider} />
            <ContactRow icon="phone-outline" label="Línea de atención" value="+1 (202) 555-0147" />
            <View style={styles.divider} />
            <ContactRow icon="clock-outline" label="Horario" value="Lun–Vie, 9:00 a. m.–5:00 p. m. (hora del Este)" />
          </View>
          <Text style={styles.location}>Estados Unidos</Text>
        </ScrollView>
        <ToastHost />
      </SafeAreaView>
    </Modal>
  );
}

function ContactRow({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}><MaterialCommunityIcons name={icon} size={19} color={colors.primary} /></View>
      <View style={styles.contactCopy}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text selectable style={styles.contactValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  brand: { color: colors.textPrimary, fontSize: 29, fontWeight: '900', marginTop: spacing.md },
  tagline: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: spacing.xs, textAlign: 'center' },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 18, lineHeight: 25, fontWeight: '800', marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: spacing.md },
  bodyLast: { marginBottom: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  contactIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  contactCopy: { flex: 1 },
  contactLabel: { color: colors.textMuted, fontSize: 11 },
  contactValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  location: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: spacing.xs },
});
