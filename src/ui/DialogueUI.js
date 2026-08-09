export class DialogueUI {
  constructor() {
    this.isOpen = false;
    this.speaker = '';
    this.text = '';
    this.displayedText = '';
    this.charIndex = 0;
    this.timer = 0;
  }

  open(speaker, text) {
    this.isOpen = true;
    this.speaker = speaker;
    this.text = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.timer = 0;
  }

  close() {
    this.isOpen = false;
  }

  update(dt) {
    if (!this.isOpen) return;
    if (this.charIndex < this.text.length) {
      this.timer += dt * 45;
      this.charIndex = Math.min(this.text.length, Math.floor(this.timer));
      this.displayedText = this.text.slice(0, this.charIndex);
    }
  }

  draw(ctx, width, height, input) {
    if (!this.isOpen) return;

    ctx.save();
    const boxW = Math.min(750, width - 40);
    const boxH = 140;
    const boxX = (width - boxW) / 2;
    const boxY = height - boxH - 40;

    // Dim Background Overlay
    ctx.fillStyle = 'rgba(4, 6, 10, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Dialogue Frame
    ctx.fillStyle = 'rgba(10, 14, 22, 0.95)';
    ctx.strokeStyle = 'rgba(160, 190, 220, 0.35)';
    ctx.lineWidth = 2;

    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Speaker Name
    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 18px Cinzel Decorative, serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.speaker, boxX + 24, boxY + 34);

    // Body Text
    ctx.fillStyle = '#eaf4ff';
    ctx.font = '15px Inter, sans-serif';
    ctx.fillText(this.displayedText, boxX + 24, boxY + 68);

    // Close Button [✕ Close (Esc / E / Space)]
    const closeBtnX = boxX + boxW - 130;
    const closeBtnY = boxY + 12;
    const closeBtnW = 110;
    const closeBtnH = 30;

    ctx.fillStyle = 'rgba(40, 60, 90, 0.8)';
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 1;
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Close [Esc/E]', closeBtnX + closeBtnW / 2, closeBtnY + 19);

    ctx.fillStyle = '#88a0c0';
    ctx.font = '13px Cinzel, serif';
    ctx.textAlign = 'right';
    ctx.fillText('Press [Space / E / Esc] or Click to Continue', boxX + boxW - 20, boxY + boxH - 16);

    ctx.restore();

    // Check Click inside close button or dialogue box
    if (input && input.mouseClicked) {
      this.close();
    }
  }
}
